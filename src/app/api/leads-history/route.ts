import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const historyFilePath = path.join(process.cwd(), "src", "data", "leads-history.json");

export async function GET() {
  const imobziSecret = process.env.IMOBZI_API_SECRET;
  let imobziLeads: any[] = [];

  // 1. Tentar buscar leads reais diretamente do Imobzi CRM
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

  // 2. Se houver histórico salvo localmente (em desenvolvimento), mesclar
  let localLeads: any[] = [];
  try {
    if (fs.existsSync(historyFilePath)) {
      const data = fs.readFileSync(historyFilePath, "utf8");
      localLeads = JSON.parse(data);
    }
  } catch (err) {
    // Silently ignore se não existir
  }

  // Mesclar leads locais e remotos priorizando os mais recentes
  const combined = [...localLeads, ...imobziLeads];
  const seen = new Set<string>();
  const uniqueLeads = combined.filter((lead) => {
    const key = lead.imobziCode || lead.imobziDbId || lead.id || lead.phone;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return NextResponse.json({ leads: uniqueLeads });
}
