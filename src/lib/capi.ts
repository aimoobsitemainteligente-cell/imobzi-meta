import { neon } from "@neondatabase/serverless";
import { initDb } from "./db";

// Integração Imobzi -> Meta Conversions API (Conversion Leads / Central de Leads)
// Regras: só leads com leadgen_id da Meta, uma etapa por vez, sempre pra frente,
// Perdido é terminal (só se não houver Convertido), eventos com mais de 7 dias são ignorados.

export type CapiStage = "Qualificado" | "Visita" | "Convertido" | "Perdido";

const STAGE_RANK: Record<CapiStage, number> = {
  Qualificado: 1,
  Visita: 2,
  Convertido: 3,
  Perdido: 4,
};

const DATASET_ID = process.env.META_CAPI_DATASET_ID || "1039563894916441";
const GRAPH_VERSION = "v22.0";
const MAX_EVENT_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const IMOBZI_BASE = "https://api.imobzi.app";

function getSql() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return null;
  return neon(databaseUrl);
}

// Datas do Imobzi vêm sem fuso (ex.: 2026-10-15T14:15:27.550014) e são UTC
function parseImobziDate(value?: string | null): number | null {
  if (!value) return null;
  const v = /[zZ]|[+-]\d\d:?\d\d$/.test(value) ? value : value + "Z";
  const ms = new Date(v).getTime();
  return isNaN(ms) ? null : ms;
}

function normalize(s: string) {
  return (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export interface MappedDealStage {
  stage: CapiStage;
  eventTimeMs: number | null;
  dealId: string;
  source: string; // descrição p/ log (ex.: "win", "stage:Visita")
}

/** Mapeia um deal do Imobzi para a etapa da Meta (ou null se não manda nada). */
export function mapDealToStage(deal: any): MappedDealStage | null {
  const dealId = deal?.db_id || "";
  if (deal?.status === "win") {
    return { stage: "Convertido", eventTimeMs: parseImobziDate(deal.date_close) ?? parseImobziDate(deal.stage_date), dealId, source: "win" };
  }
  if (deal?.status === "lost") {
    return { stage: "Perdido", eventTimeMs: parseImobziDate(deal.date_close) ?? parseImobziDate(deal.stage_date), dealId, source: "lost" };
  }
  const s = normalize(deal?.stage_name);
  let stage: CapiStage | null = null;
  if (s.includes("assinatura") || s.includes("contrato")) stage = "Convertido";
  else if (s.includes("proposta") || s.includes("visita")) stage = "Visita";
  else if (s.includes("interesse")) stage = "Qualificado";
  // Plantão / Locação / Repescagem / Etapa 1-2 / outros: não manda (fica "Em análise")
  if (!stage) return null;
  return { stage, eventTimeMs: parseImobziDate(deal.stage_date), dealId, source: `stage:${deal.stage_name}` };
}

/** Escolhe a etapa do contato considerando todos os deals dele. Perdido só se TODOS os deals mapeáveis forem perdidos. */
export function pickContactStage(deals: any[]): MappedDealStage | null {
  const mapped = deals.map(mapDealToStage).filter(Boolean) as MappedDealStage[];
  const active = mapped.filter((m) => m.stage !== "Perdido");
  if (active.length > 0) {
    return active.sort((a, b) => STAGE_RANK[b.stage] - STAGE_RANK[a.stage] || (b.eventTimeMs || 0) - (a.eventTimeMs || 0))[0];
  }
  // Perdido só conta se não existir nenhum deal em andamento sem etapa mapeada (ex.: em Plantão)
  const hasOpen = deals.some((d) => d?.status !== "lost");
  if (hasOpen) return null;
  const lost = mapped.filter((m) => m.stage === "Perdido");
  return lost.sort((a, b) => (b.eventTimeMs || 0) - (a.eventTimeMs || 0))[0] || null;
}

// ---------- Imobzi ----------

async function fetchDealsByStatus(status: "in progress" | "win" | "lost", maxPages: number): Promise<any[]> {
  const secret = process.env.IMOBZI_API_SECRET;
  if (!secret) throw new Error("IMOBZI_API_SECRET ausente");
  const all: any[] = [];
  let cursor = "";
  for (let page = 0; page < maxPages; page++) {
    const qs = new URLSearchParams({ limit: "100" });
    if (status !== "in progress") qs.set("status", status);
    if (cursor) qs.set("cursor", cursor);
    const res = await fetch(`${IMOBZI_BASE}/v1/deals/search?${qs}`, {
      headers: { "X-Imobzi-Secret": secret },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Imobzi deals/search ${status} HTTP ${res.status}`);
    const data = await res.json();
    const deals = Array.isArray(data.deals) ? data.deals : [];
    all.push(...deals);
    if (!data.cursor || deals.length === 0 || all.length >= (data.count || 0)) break;
    cursor = data.cursor;
  }
  return all;
}

/** Busca deals do Imobzi agrupados pelo db_id do contato. Obs.: /v1/deals?contact_id= ignora o filtro, por isso varremos a busca. */
export async function fetchDealsByContact(): Promise<Map<string, any[]>> {
  const [open, win, lost] = await Promise.all([
    fetchDealsByStatus("in progress", 20),
    fetchDealsByStatus("win", 3),
    fetchDealsByStatus("lost", 5), // vem do mais recente; só interessam os dos últimos 7 dias
  ]);
  const map = new Map<string, any[]>();
  for (const d of [...open, ...win, ...lost]) {
    const cid = d?.contact?.db_id;
    if (!cid) continue;
    const list = map.get(String(cid)) || [];
    if (!list.some((x) => x.db_id === d.db_id)) list.push(d);
    map.set(String(cid), list);
  }
  return map;
}

// ---------- Neon ----------

interface CapiRecord { lead_id: string; stage: CapiStage; status: string }

async function getProcessed(sql: any, leadIds: string[]): Promise<Map<string, CapiRecord[]>> {
  const map = new Map<string, CapiRecord[]>();
  if (leadIds.length === 0) return map;
  // 'sent' e 'skipped' contam como já processados; 'failed' é tentado de novo; envios de teste não ficam gravados
  let rows: any[] = [];
  try {
    rows = await sql`
      SELECT lead_id, stage, status FROM capi_events
      WHERE lead_id = ANY(${leadIds}) AND status IN ('sent', 'skipped')
    `;
  } catch (e: any) {
    if (!String(e?.message || e).includes("capi_events")) throw e; // tabela ainda não criada
  }
  for (const r of rows as any[]) {
    const list = map.get(r.lead_id) || [];
    list.push(r);
    map.set(r.lead_id, list);
  }
  return map;
}

async function recordEvent(sql: any, leadId: string, stage: CapiStage, status: string, dealId: string, eventTimeMs: number | null, detail: string) {
  await sql`
    INSERT INTO capi_events (lead_id, stage, status, deal_id, event_time, detail)
    VALUES (${leadId}, ${stage}, ${status}, ${dealId || null}, ${eventTimeMs ? new Date(eventTimeMs).toISOString() : null}, ${detail.slice(0, 1000)})
    ON CONFLICT (lead_id, stage) DO UPDATE SET
      status = EXCLUDED.status, deal_id = EXCLUDED.deal_id, event_time = EXCLUDED.event_time,
      detail = EXCLUDED.detail, created_at = CURRENT_TIMESTAMP
  `;
}

/** Decide se a etapa deve ir pra Meta, dado o que já foi processado (sempre pra frente). */
export function shouldSend(stage: CapiStage, processed: CapiRecord[]): boolean {
  if (processed.some((p) => p.stage === stage)) return false;
  if (processed.some((p) => p.stage === "Perdido")) return false; // Perdido é terminal
  if (stage === "Perdido") return !processed.some((p) => p.stage === "Convertido");
  const maxRank = Math.max(0, ...processed.filter((p) => p.stage !== "Perdido").map((p) => STAGE_RANK[p.stage]));
  return STAGE_RANK[stage] > maxRank;
}

// ---------- Meta CAPI ----------

export async function sendCapiEvent(leadId: string, stage: CapiStage, eventTimeMs: number, testEventCode?: string) {
  const token = process.env.META_CAPI_TOKEN;
  if (!token) throw new Error("META_CAPI_TOKEN ausente");
  if (!/^\d+$/.test(leadId)) throw new Error("lead_id inválido");
  // lead_id tem 15-17 dígitos (passa do Number.MAX_SAFE_INTEGER), então vai como inteiro literal no JSON
  const placeholder = "__LEAD_ID__";
  const payload: any = {
    data: [
      {
        event_name: stage,
        event_time: Math.floor(eventTimeMs / 1000),
        action_source: "system_generated",
        user_data: { lead_id: placeholder },
        custom_data: { event_source: "crm", lead_event_source: "Imobzi" },
      },
    ],
  };
  if (testEventCode) payload.test_event_code = testEventCode;
  const body = JSON.stringify(payload).replace(`"${placeholder}"`, leadId);

  const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${DATASET_ID}/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body,
    cache: "no-store",
  });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, json };
}

// ---------- Orquestração ----------

export interface CapiSyncOptions {
  dryRun?: boolean;
  testEventCode?: string;
  lookbackDays?: number;
  limit?: number;
}

export interface CapiSyncItem {
  lead_id: string;
  name?: string;
  stage?: CapiStage;
  action: "send" | "sent" | "test_sent" | "skipped_old" | "already" | "no_stage" | "no_deal" | "failed";
  event_time?: string;
  detail?: string;
}

export async function runCapiSync(opts: CapiSyncOptions = {}) {
  const sql = getSql();
  if (!sql) throw new Error("DATABASE_URL ausente");
  // dry-run não altera o banco (não cria tabela)
  if (!opts.dryRun) await initDb();

  const lookback = opts.lookbackDays ?? 60;
  const limit = opts.limit ?? 500;
  const testEventCode = opts.testEventCode || process.env.META_CAPI_TEST_EVENT_CODE || undefined;

  const leads = (await sql`
    SELECT lead_id, name, imobzi_db_id, created_at FROM meta_leads
    WHERE imobzi_db_id IS NOT NULL AND lead_id ~ '^[0-9]+$'
      AND name NOT LIKE '<test lead%' -- leads de teste da Meta
      AND created_at >= NOW() - make_interval(days => ${lookback})
    ORDER BY created_at DESC
    LIMIT ${limit}
  `) as any[];

  const dealsByContact = await fetchDealsByContact();
  const processed = await getProcessed(sql, leads.map((l) => l.lead_id));
  const now = Date.now();
  const items: CapiSyncItem[] = [];

  for (const lead of leads) {
    const deals = dealsByContact.get(String(lead.imobzi_db_id)) || [];
    if (deals.length === 0) { items.push({ lead_id: lead.lead_id, name: lead.name, action: "no_deal" }); continue; }
    const picked = pickContactStage(deals);
    if (!picked) { items.push({ lead_id: lead.lead_id, name: lead.name, action: "no_stage" }); continue; }

    const done = processed.get(lead.lead_id) || [];
    const base = { lead_id: lead.lead_id, name: lead.name, stage: picked.stage, event_time: picked.eventTimeMs ? new Date(picked.eventTimeMs).toISOString() : undefined };
    if (!shouldSend(picked.stage, done)) { items.push({ ...base, action: "already" }); continue; }

    const eventTimeMs = picked.eventTimeMs ?? now;
    if (now - eventTimeMs > MAX_EVENT_AGE_MS) {
      if (!opts.dryRun && !testEventCode) {
        try {
          await recordEvent(sql, lead.lead_id, picked.stage, "skipped", picked.dealId, eventTimeMs, "mais de 7 dias");
        } catch (e: any) {
          console.error("[CAPI SYNC] Erro ao gravar skipped:", lead.lead_id, e?.message || e);
        }
      }
      items.push({ ...base, action: "skipped_old" });
      continue;
    }
    if (opts.dryRun) { items.push({ ...base, action: "send" }); continue; }

    try {
      const r = await sendCapiEvent(lead.lead_id, picked.stage, Math.min(eventTimeMs, now), testEventCode);
      const detail = JSON.stringify(r.json).slice(0, 500);
      if (r.ok) {
        // Envio de teste não grava, pra não bloquear o envio real depois
        if (!testEventCode) await recordEvent(sql, lead.lead_id, picked.stage, "sent", picked.dealId, eventTimeMs, detail);
        items.push({ ...base, action: testEventCode ? "test_sent" : "sent", detail });
      } else {
        if (!testEventCode) await recordEvent(sql, lead.lead_id, picked.stage, "failed", picked.dealId, eventTimeMs, detail);
        items.push({ ...base, action: "failed", detail });
      }
    } catch (e: any) {
      items.push({ ...base, action: "failed", detail: String(e?.message || e) });
    }
  }

  const summary: Record<string, number> = {};
  for (const i of items) {
    const k = `${i.action}${i.stage ? ":" + i.stage : ""}`;
    summary[k] = (summary[k] || 0) + 1;
  }
  return { leads: leads.length, testEventCode: !!testEventCode, dryRun: !!opts.dryRun, summary, items };
}
