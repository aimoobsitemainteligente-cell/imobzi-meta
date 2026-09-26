import { neon } from "@neondatabase/serverless";

export interface DbLeadRecord {
  id?: number;
  lead_id: string;
  form_id?: string;
  form_name?: string;
  campaign_name?: string;
  ad_name?: string;
  name: string;
  phone?: string;
  email?: string;
  property_code?: string;
  imobzi_code?: string;
  imobzi_db_id?: string;
  status: "success" | "failed";
  source?: string;
  formatted_note?: string;
  raw_payload?: any;
  created_at?: string;
}

function getSql() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return null;
  }
  return neon(databaseUrl);
}

let tableInitialized = false;

export async function initDb() {
  if (tableInitialized) return true;
  const sql = getSql();
  if (!sql) return false;

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS meta_leads (
        id SERIAL PRIMARY KEY,
        lead_id VARCHAR(100) UNIQUE,
        form_id VARCHAR(100),
        form_name VARCHAR(255),
        campaign_name VARCHAR(255),
        ad_name VARCHAR(255),
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(100),
        email VARCHAR(255),
        property_code VARCHAR(100),
        imobzi_code VARCHAR(100),
        imobzi_db_id VARCHAR(100),
        status VARCHAR(50) DEFAULT 'success',
        source VARCHAR(255),
        formatted_note TEXT,
        raw_payload JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS tv_leads (
        id SERIAL PRIMARY KEY,
        lead_id VARCHAR(100) UNIQUE,
        nome TEXT,
        telefone VARCHAR(100),
        ad_name VARCHAR(255),
        imovel VARCHAR(100),
        primeiro_contato_data VARCHAR(20),
        primeiro_contato_hora VARCHAR(20),
        estagio TEXT,
        corretor_nome TEXT,
        status VARCHAR(100),
        tempo_resposta VARCHAR(50),
        link_imobzi VARCHAR(255),
        origem VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE
      );
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_meta_leads_created_at 
      ON meta_leads(created_at DESC);
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_tv_leads_created_at 
      ON tv_leads(created_at DESC);
    `;

    tableInitialized = true;
    return true;
  } catch (err) {
    console.error("Erro ao inicializar tabela meta_leads no Neon:", err);
    return false;
  }
}

export async function saveLeadToDb(lead: DbLeadRecord): Promise<boolean> {
  const sql = getSql();
  if (!sql) return false;

  try {
    await initDb();

    const rawPayloadJson = lead.raw_payload
      ? JSON.stringify(lead.raw_payload)
      : null;

    await sql`
      INSERT INTO meta_leads (
        lead_id,
        form_id,
        form_name,
        campaign_name,
        ad_name,
        name,
        phone,
        email,
        property_code,
        imobzi_code,
        imobzi_db_id,
        status,
        source,
        formatted_note,
        raw_payload
      ) VALUES (
        ${lead.lead_id},
        ${lead.form_id || null},
        ${lead.form_name || null},
        ${lead.campaign_name || null},
        ${lead.ad_name || null},
        ${lead.name},
        ${lead.phone || null},
        ${lead.email || null},
        ${lead.property_code || null},
        ${lead.imobzi_code || null},
        ${lead.imobzi_db_id || null},
        ${lead.status || "success"},
        ${lead.source || "Meta Leads Ads"},
        ${lead.formatted_note || null},
        ${rawPayloadJson}
      )
      ON CONFLICT (lead_id) DO UPDATE SET
        imobzi_code = EXCLUDED.imobzi_code,
        imobzi_db_id = EXCLUDED.imobzi_db_id,
        status = EXCLUDED.status,
        property_code = COALESCE(EXCLUDED.property_code, meta_leads.property_code);
    `;

    return true;
  } catch (err) {
    console.error("Erro ao salvar lead no Neon:", err);
    return false;
  }
}

export async function getLeadsFromDb(limit: number = 50): Promise<DbLeadRecord[]> {
  const sql = getSql();
  if (!sql) return [];

  try {
    await initDb();

    const rows = await sql`
      SELECT 
        lead_id,
        form_id,
        form_name,
        campaign_name,
        ad_name,
        name,
        phone,
        email,
        property_code,
        imobzi_code,
        imobzi_db_id,
        status,
        source,
        formatted_note,
        created_at
      FROM meta_leads
      ORDER BY created_at DESC
      LIMIT ${limit};
    `;

    return rows.map((r: any) => ({
      lead_id: r.lead_id,
      form_id: r.form_id,
      form_name: r.form_name,
      campaign_name: r.campaign_name,
      ad_name: r.ad_name,
      name: r.name,
      phone: r.phone,
      email: r.email,
      property_code: r.property_code,
      imobzi_code: r.imobzi_code,
      imobzi_db_id: r.imobzi_db_id,
      status: r.status,
      source: r.source,
      formatted_note: r.formatted_note,
      created_at: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
    }));
  } catch (err) {
    console.error("Erro ao carregar leads do Neon:", err);
    return [];
  }
}

export async function syncTvLeads(leads: any[]): Promise<boolean> {
  const sql = getSql();
  if (!sql) return false;

  try {
    await initDb();
    
    // Apenas inserir sequencialmente já que a função HTTP do Neon não suporta sql.begin()
    for (const lead of leads) {
      try {
        await sql`
          INSERT INTO tv_leads (
            lead_id, nome, telefone, ad_name, imovel, primeiro_contato_data,
            primeiro_contato_hora, estagio, corretor_nome, status, tempo_resposta,
            link_imobzi, origem, created_at
          ) VALUES (
            ${lead.lead_id}, ${lead.nome}, ${lead.telefone}, ${lead.ad_name}, ${lead.imovel},
            ${lead.primeiro_contato_data}, ${lead.primeiro_contato_hora}, ${lead.estagio},
            ${lead.corretor_nome}, ${lead.status}, ${lead.tempo_resposta}, ${lead.link_imobzi},
            ${lead.origem}, ${lead.created_at}
          )
          ON CONFLICT (lead_id) DO UPDATE SET
            nome = EXCLUDED.nome,
            telefone = EXCLUDED.telefone,
            ad_name = EXCLUDED.ad_name,
            imovel = EXCLUDED.imovel,
            primeiro_contato_data = EXCLUDED.primeiro_contato_data,
            primeiro_contato_hora = EXCLUDED.primeiro_contato_hora,
            estagio = EXCLUDED.estagio,
            corretor_nome = EXCLUDED.corretor_nome,
            status = EXCLUDED.status,
            tempo_resposta = EXCLUDED.tempo_resposta,
            link_imobzi = EXCLUDED.link_imobzi,
            origem = EXCLUDED.origem,
            created_at = EXCLUDED.created_at;
        `;
      } catch (e) {
        console.error("Erro inserindo lead", lead.lead_id, e);
      }
    }

    return true;
  } catch (err) {
    console.error("Erro ao sincronizar tv_leads no Neon:", err);
    return false;
  }
}

export async function getTvLeadsFromDb(): Promise<any[]> {
  const sql = getSql();
  if (!sql) return [];

  try {
    await initDb();
    const rows = await sql`
      SELECT * FROM tv_leads
      ORDER BY created_at DESC
      LIMIT 1000;
    `;
    
    return rows.map((r: any) => ({
      ...r,
      created_at: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
    }));
  } catch (err) {
    console.error("Erro ao carregar tv_leads do Neon:", err);
    return [];
  }
}
