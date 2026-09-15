import { NextRequest, NextResponse } from "next/server";
import { getLeadDetails } from "@/lib/meta";
import { sendLeadToImobzi } from "@/lib/imobzi";
import { saveLeadToDb } from "@/lib/db";

// GET - Validação do webhook pela Meta
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const verifyToken = process.env.META_VERIFY_TOKEN;

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('Webhook verificado com sucesso pelo Meta!');
    return new NextResponse(challenge, { status: 200 });
  } else {
    console.error('Falha na verificação do Webhook');
    return new NextResponse('Forbidden', { status: 403 });
  }
}

// POST - Recebe os eventos de novos Leads
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Validar se é um evento do "page" (Facebook Page)
    if (body.object === 'page') {
      const entry = body.entry;

      if (entry && entry.length > 0) {
        for (const record of entry) {
          const changes = record.changes;
          
          if (changes && changes.length > 0) {
            for (const change of changes) {
              // Verifica se a notificação é de um novo lead
              if (change.field === 'leadgen' && change.value) {
                const leadgenId = change.value.leadgen_id;
                const formId = change.value.form_id;
                
                if (leadgenId) {
                  console.log(`Novo lead detectado! Lead ID: ${leadgenId} | Form ID: ${formId || 'N/A'}`);
                  
                  // 1. Buscar detalhes do lead na Graph API incluindo o formulário
                  const leadData = await getLeadDetails(leadgenId, formId);
                  
                  if (leadData) {
                    // 2. Enviar os dados para a Imobzi
                    await sendLeadToImobzi(leadData);
                  } else {
                    // 3. Fallback: Registrar no banco Neon que o webhook foi disparado
                    await saveLeadToDb({
                      lead_id: leadgenId,
                      form_id: formId,
                      name: `Lead Meta (${leadgenId})`,
                      status: 'success',
                      source: 'Webhook Meta Lead Ads',
                    });
                  }
                }
              }
            }
          }
        }
      }
      
      // Sempre retorne 200 OK rapidamente para a Meta saber que recebemos o evento
      return new NextResponse('EVENT_RECEIVED', { status: 200 });
    } else {
      return new NextResponse('Not a page event', { status: 404 });
    }
  } catch (error) {
    console.error('Erro ao processar o Webhook:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
