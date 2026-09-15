import { NextRequest, NextResponse } from "next/server";
import { sendLeadToImobzi } from "@/lib/imobzi";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    
    // Carrega o mapeamento ativo para garantir compatibilidade
    const fs = require('fs');
    const path = require('path');
    let mapping = {
      contactFields: {
        fullname: "nome_completo",
        phone: "phone_number",
        email: "email",
        propertyCode: "Código do Imóvel",
      }
    };
    try {
      const p = path.join(process.cwd(), 'src', 'data', 'field-mapping.json');
      if (fs.existsSync(p)) {
        mapping = JSON.parse(fs.readFileSync(p, 'utf8'));
      }
    } catch (e) {}

    const dummyLead = {
      id: "simulacao_" + Date.now(),
      created_time: new Date().toISOString(),
      form_id: body.formId || "1076746638055354",
      form_name: body.formName || "[U.M] FORM PADRÃO - ALPHAVILLE II [LÓG.COND.] [10/09/26]",
      campaign_name: body.campaignName || "Campanha Alphaville II",
      ad_name: body.adName || "Anúncio Casas e Lotes",
      platform: body.platform || "ig",
      field_data: [
        { name: mapping.contactFields?.fullname || "nome_completo", values: [body.name || body.nome_completo || "Cláudia Silva"] },
        { name: mapping.contactFields?.phone || "phone_number", values: [body.phone || body.phone_number || "(22) 99734-7196"] },
        { name: mapping.contactFields?.email || "email", values: [body.email || "claudia.silva@exemplo.com"] },
        { name: mapping.contactFields?.propertyCode || "Código do Imóvel", values: [body.imovelCode || body.codigo_imovel || "386"] },
        { name: "qual_seria_a_sua_disponibilidade_para_aquisição?", values: ["Imediata (próximos 30 dias)"] },
        { name: "possuí_valor_de_entrada_disponível?", values: ["Sim, disponível em conta"] },
      ],
    };

    if (body.customFields && Array.isArray(body.customFields)) {
      dummyLead.field_data.push(...body.customFields);
    }

    const success = await sendLeadToImobzi(dummyLead);

    if (success) {
      return NextResponse.json({
        success: true,
        message: "Lead de simulação enviado com sucesso para o Imobzi!",
        lead: dummyLead,
      });
    } else {
      return NextResponse.json(
        { success: false, message: "Falha ao enviar lead para o Imobzi. Verifique os logs." },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Erro no teste de lead:", error);
    return NextResponse.json({ error: "Erro interno ao simular lead" }, { status: 500 });
  }
}
