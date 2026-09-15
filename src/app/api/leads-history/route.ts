import { NextResponse } from "next/server";
import { getLeadsFromDb } from "@/lib/db";
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

  // 2. Buscar contatos e leads recentes diretamente do Imobzi CRM
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

  // 3. Fallback para arquivo local (se existir)
  let localLeads: any[] = [];
  try {
    if (fs.existsSync(historyFilePath)) {
      const data = fs.readFileSync(historyFilePath, "utf8");
      localLeads = JSON.parse(data);
    }
  } catch (err) {
    // Silently ignore
  }

  // 4. Mesclar todos os registros com prioridade: Neon > Imobzi > Local
  const combined = [...neonLeads, ...imobziLeads, ...localLeads];
  const seen = new Set<string>();
  const uniqueLeads = combined.filter((lead) => {
    const key = lead.imobziCode || lead.imobziDbId || lead.id || lead.phone;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return NextResponse.json({ leads: uniqueLeads });
}
