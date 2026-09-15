import { NextResponse } from "next/server";
import { getLeadsFromDb } from "@/lib/db";
import { getRecentMetaLeads } from "@/lib/meta";
import fs from "fs";
import path from "path";

const historyFilePath = path.join(process.cwd(), "src", "data", "leads-history.json");

export async function GET() {
  let neonLeads: any[] = [];

  // 1. Buscar leads registrados no Neon PostgreSQL (Persistência em Nuvem)
  try {
    const rows = await getLeadsFromDb(50);
    if (rows && rows.length > 0) {
      neonLeads = rows.map((r) => ({
        id: r.lead_id,
        timestamp: r.created_at || new Date().toISOString(),
        name: r.name,
        phone: r.phone || "",
        email: r.email || "",
        propertyCode: r.property_code || "",
        imobziCode: r.imobzi_code || "",
        imobziDbId: r.imobzi_db_id || "",
        status: r.status || "success",
        source: r.source || "Meta Lead Ads",
        formId: r.form_id,
        formName: r.form_name,
        campaignName: r.campaign_name,
        adName: r.ad_name,
        formattedNote: r.formatted_note,
      }));
    }
  } catch (err) {
    console.error("Erro ao buscar leads do Neon PostgreSQL:", err);
  }

  // 2. Buscar leads reais e de teste diretamente da Graph API do Meta (Facebook Leads)
  let metaDirectLeads: any[] = [];
  try {
    const rawMetaLeads = await getRecentMetaLeads(5);
    metaDirectLeads = rawMetaLeads.map((m) => {
      const getField = (patterns: string[]) => {
        if (!m.field_data) return "";
        for (const p of patterns) {
          const found = m.field_data.find((f) => f.name.toLowerCase().includes(p));
          if (found && found.values && found.values.length > 0) return found.values[0];
        }
        return "";
      };

      const name = getField(["nome", "name"]) || "Lead Facebook";
      const phone = getField(["telefone", "phone", "celular", "whatsapp"]);
      const email = getField(["email"]);
      const propertyCode = getField(["imóvel", "imovel", "código", "codigo"]);

      return {
        id: m.id,
        timestamp: m.created_time || new Date().toISOString(),
        name: name,
        phone: phone,
        email: email,
        propertyCode: propertyCode,
        imobziCode: "",
        imobziDbId: "",
        status: "success" as const,
        source: m.form_name ? `Facebook Leads - ${m.form_name}` : "Facebook Leads",
        formId: m.form_id,
        formName: m.form_name,
        campaignName: m.campaign_name,
        adName: m.ad_name,
        formattedNote: null,
      };
    });
  } catch (err) {
    console.error("Erro ao sincronizar leads diretos do Meta:", err);
  }

  // 3. Buscar contatos e leads recentes diretamente do Imobzi CRM
  let imobziLeads: any[] = [];
  const imobziSecret = process.env.IMOBZI_API_SECRET;
  if (imobziSecret) {
    try {
      const res = await fetch(
        "https://api.imobzi.app/v1/contacts?order=recently_created",
        {
          headers: {
            "X-Imobzi-Secret": imobziSecret,
          },
          cache: "no-store",
        }
      );

      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.contacts)) {
          imobziLeads = data.contacts.map((c: any) => {
            const phone =
              c.phones && c.phones.length > 0
                ? c.phones[0].number || c.phones[0].number_plain || ""
                : "";
            const email =
              c.email || (c.emails && c.emails.length > 0 ? c.emails[0] : "");

            return {
              id: "imobzi_" + (c.contact_id || c.code),
              timestamp: c.created_at || new Date().toISOString(),
              name: c.fullname || c.name || "Lead Imobzi",
              phone: phone,
              email: typeof email === "string" ? email : email?.email || "",
              propertyCode: "",
              imobziCode: c.code,
              imobziDbId: c.contact_id,
              status: "success",
              source: c.media_source || "Imobzi CRM",
              formName: c.media_source?.startsWith("Facebook Leads")
                ? c.media_source.replace("Facebook Leads - ", "")
                : undefined,
            };
          });
        }
      }
    } catch (err) {
      console.error("Erro ao buscar contatos da API do Imobzi:", err);
    }
  }

  // 4. Fallback para arquivo local (se existir)
  let localLeads: any[] = [];
  try {
    if (fs.existsSync(historyFilePath)) {
      const data = fs.readFileSync(historyFilePath, "utf8");
      localLeads = JSON.parse(data);
    }
  } catch (err) {
    // Silently ignore
  }

  // 5. Mesclar todos os registros com prioridade: Neon > Meta Graph API > Imobzi > Local
  const combined = [...neonLeads, ...metaDirectLeads, ...imobziLeads, ...localLeads];
  
  // Ordenar por data mais recente primeiro
  combined.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const seen = new Set<string>();
  const uniqueLeads = combined.filter((lead) => {
    const key = lead.id || lead.imobziCode || lead.imobziDbId || (lead.phone ? lead.phone.replace(/\D/g, '') : null);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return NextResponse.json({ leads: uniqueLeads.slice(0, 100) });
}
