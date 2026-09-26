import { NextResponse } from 'next/server';
import { getSheetsData } from '@/lib/tv/sheets';
import { syncTvLeads } from '@/lib/db';
import { formatToSP, parseFromSP } from '@/lib/time';

export async function GET() {
  try {
    console.log("[SYNC TV] Iniciando sincronização Sheets + Imobzi -> Neon");

    // 1. Obter Leads da Planilha (Fonte de Verdade do Meta)
    const sheetsLeads = await getSheetsData();
    
    // Set para rastrear leads vindos do Meta para não duplicá-los com o que vier do Imobzi
    const metaPhones = new Set<string>();
    
    const formattedSheetsLeads = sheetsLeads.map(lead => {
      // Registrar telefone limpo para deduplicação
      const cleanPhone = (lead.telefone || '').replace(/\D/g, '');
      if (cleanPhone) metaPhones.add(cleanPhone);

      // Fix created_at for Postgres
      let createdAtIso = new Date().toISOString();
      if (lead.created_at) {
        if (lead.created_at.includes('/')) {
          const parts = lead.created_at.split(' ');
          const ms = parseFromSP(parts[0], parts[1]);
          if (ms) createdAtIso = new Date(ms).toISOString();
        } else {
          const d = new Date(lead.created_at);
          if (!isNaN(d.getTime())) createdAtIso = d.toISOString();
        }
      }

      return {
        ...lead,
        created_at: createdAtIso,
        origem: 'META', // Garante que a origem seja marcada como META
      };
    });

    // 2. Obter Leads do Imobzi CRM (Outras Origens)
    let imobziLeads: any[] = [];
    const imobziSecret = process.env.IMOBZI_API_SECRET;
    if (imobziSecret) {
      try {
        const res = await fetch(
          "https://api.imobzi.app/v1/contacts?order=recently_created&limit=100",
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
            const filteredContacts = data.contacts.filter((c: any) => {
              // Filtrar contatos que vieram do Meta/Facebook para evitar duplicação com a planilha
              const source = c.media_source || '';
              if (source.toLowerCase().includes('facebook') || source.toLowerCase().includes('meta')) {
                return false;
              }
              
              // Filtrar por telefone se já existir na planilha
              const phone = c.phones && c.phones.length > 0 
                ? (c.phones[0].number || c.phones[0].number_plain || '').replace(/\D/g, '')
                : '';
              
              if (phone && metaPhones.has(phone)) {
                return false;
              }

              return true;
            });

            // Fetch Deals para esses contatos em paralelo
            imobziLeads = await Promise.all(filteredContacts.map(async (c: any) => {
              const phone = c.phones && c.phones.length > 0
                ? c.phones[0].number || c.phones[0].number_plain || ""
                : "";
              
              const createdAtStr = c.created_at || new Date().toISOString();
              const { data: dateSP, hora: timeSP } = formatToSP(createdAtStr);

              let dealStatus = 'Novo'; // Estágio real
              let funnelStatus = 'novo'; // Status do Funil da TV
              let dealAssignedTo = 'Equipe';

              try {
                const dRes = await fetch(`https://api.imobzi.app/v1/deals?contact_id=${c.contact_id}`, {
                  headers: { "X-Imobzi-Secret": imobziSecret },
                  cache: "no-store",
                });
                
                if (dRes.ok) {
                  const dData = await dRes.json();
                  for (const key in dData) {
                    if (typeof dData[key] === 'object' && dData[key].deals && dData[key].deals.length > 0) {
                      const deal = dData[key].deals[0]; // pega o mais recente/primeiro da lista
                      dealStatus = deal.stage_name || 'Negócio';
                      if (deal.user && deal.user.name) {
                        dealAssignedTo = deal.user.name;
                      }

                      if (deal.status === 'win') {
                        funnelStatus = 'ganho';
                      } else {
                        const s = dealStatus.toLowerCase();
                        if (s.includes('proposta') || s.includes('assinatura') || s.includes('contrato')) {
                          funnelStatus = 'proposta';
                        } else if (s.includes('visita')) {
                          funnelStatus = 'visita agendada';
                        } else if (s.includes('interesse')) {
                          funnelStatus = 'em negociação';
                        } else {
                          funnelStatus = 'atendido'; // Se tem deal, é pelo menos "atendido"
                        }
                      }
                      break; // Achou um deal, não precisa olhar os outros estagios
                    }
                  }
                }
              } catch (e) {
                console.error("Erro ao buscar deals do contato", c.contact_id, e);
              }

              return {
                lead_id: "imobzi_" + (c.contact_id || c.code),
                created_at: createdAtStr,
                nome: c.fullname || c.name || "Lead Imobzi",
                telefone: phone,
                ad_name: '',
                imovel: '',
                primeiro_contato_data: dateSP,
                primeiro_contato_hora: timeSP,
                estagio: dealStatus, 
                corretor_nome: dealAssignedTo, 
                status: funnelStatus, 
                tempo_resposta: '0',
                link_imobzi: `https://my.imobzi.com/#/contact/${c.contact_id}`,
                origem: c.media_source || 'Imobzi CRM',
              };
            }));
          }
        }
      } catch (err) {
        console.error("Erro ao buscar contatos da API do Imobzi:", err);
      }
    }

    // 3. Mesclar e Salvar no Neon
    const allLeads = [...formattedSheetsLeads, ...imobziLeads];
    
    const success = await syncTvLeads(allLeads);

    if (success) {
      return NextResponse.json({ success: true, count: allLeads.length });
    } else {
      return NextResponse.json({ error: "Failed to sync to Neon" }, { status: 500 });
    }
  } catch (error) {
    console.error("Erro no sync da TV:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
