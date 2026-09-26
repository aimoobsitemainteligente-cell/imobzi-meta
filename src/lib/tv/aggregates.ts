import { TvDashboardData } from './types';

export function calculateDashboardData(leads: any[]): TvDashboardData {
  const hoje = new Date().toLocaleDateString('pt-BR');
  
  // Count leads from today and month
  let leadsHojeMeta = 0;
  let leadsHojeOutros = 0;
  let leadsMesMeta = 0;
  let leadsMesOutros = 0;
  let semDono = 0;
  
  let entraram = leads.length;
  let atendidos = 0;
  let qualificados = 0;
  let visitas = 0;
  let propostas = 0;
  let fecharam = 0;
  
  const brokerMap = new Map<string, { visitas: number, name: string }>();
  const campaignMap = new Map<string, number>();

  // Helper para normalizar strings
  const normalize = (s: string) => (s || '').trim().toLowerCase();

  // Helper para parsear DD/MM/YYYY HH:MM
  const parseDateTime = (dateTimeStr: string) => {
    if (!dateTimeStr) return 0;
    if (dateTimeStr.includes('T')) return new Date(dateTimeStr).getTime();
    
    const [datePart, timePart] = dateTimeStr.split(' ');
    if (!datePart) return 0;
    const dParts = datePart.split('/');
    if (dParts.length !== 3) return 0;
    const tParts = (timePart || '00:00').split(':');
    return new Date(
      parseInt(dParts[2]), 
      parseInt(dParts[1]) - 1, 
      parseInt(dParts[0]), 
      parseInt(tParts[0] || '0'), 
      parseInt(tParts[1] || '0')
    ).getTime();
  };

  const responseTimes: number[] = [];
  let sla5MinCount = 0;
  let totalAtendidosComTempo = 0;

  // Sort leads for ticker (newest first)
  const ticker = [...leads].reverse().slice(0, 5).map(l => {
    // mask name: "Wesley" -> "W***"
    const nameParts = (l.nome || 'Sem Nome').split(' ');
    const firstName = nameParts[0];
    const masked = firstName.length > 1 ? firstName[0] + '***' : '***';
    const finalName = nameParts.length > 1 ? `${masked} ${nameParts[nameParts.length - 1]}` : masked;
    
    return {
      lead_id: l.lead_id,
      nome_mascarado: finalName,
      estagio: l.status || 'Novo',
      time_ago: l.created_at.split(' ')[1] || 'Recente' // just the time for now
    };
  });

  const mesAtual = new Date().toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' }); // MM/YYYY

  for (const lead of leads) {
    const dataParts = lead.created_at.split(' ')[0].split('/'); // DD/MM/YYYY
    const dataCriacao = lead.created_at.split(' ')[0];
    const mesLead = dataParts.length === 3 ? `${dataParts[1]}/${dataParts[2]}` : '';
    
    if (dataCriacao === hoje) {
      if (lead.origem === 'META') leadsHojeMeta++;
      else leadsHojeOutros++;
    }
    
    if (mesLead === mesAtual) {
      if (lead.origem === 'META') leadsMesMeta++;
      else leadsMesOutros++;
    }
    
    const corretor = (lead.corretor_nome || '').trim();
    if (!corretor || corretor.toLowerCase() === 'sem dono') {
      semDono++;
    }

    const status = normalize(lead.status);
    const hasStatus = status !== '' && status !== 'novo';
    const hasCorretor = corretor !== '' && corretor.toLowerCase() !== 'sem dono';
    
    // Só NÃO entra como atendido se estiver "sem status (ou novo)" E "sem corretor"
    if (hasStatus || hasCorretor) {
      atendidos++;
    }
    
    // Funnel rule (simplified based on image):
    if (['em negociação', 'visita agendada', 'proposta', 'ganho'].includes(status)) {
      qualificados++;
    }

    if (['visita agendada', 'proposta', 'ganho'].includes(status)) {
      visitas++;
      if (corretor && corretor.toLowerCase() !== 'sem dono') {
        const b = brokerMap.get(corretor) || { visitas: 0, name: corretor };
        b.visitas++;
        brokerMap.set(corretor, b);
      }
    }
    if (['proposta', 'ganho'].includes(status)) propostas++;
    if (status === 'ganho') fecharam++;

    // Campaign tracking
    const adName = (lead.ad_name || '').trim();
    if (adName) {
      campaignMap.set(adName, (campaignMap.get(adName) || 0) + 1);
    }

    // SLA & Tempo Médio
    const createdTime = parseDateTime(lead.created_at);
    let primeiroContatoStr = '';
    if (lead.primeiro_contato_data) {
      primeiroContatoStr = `${lead.primeiro_contato_data} ${lead.primeiro_contato_hora || '00:00'}`;
    }
    const contatoTime = parseDateTime(primeiroContatoStr);
    
    if (createdTime > 0 && contatoTime > createdTime) {
      const diffMinutes = (contatoTime - createdTime) / 1000 / 60;
      responseTimes.push(diffMinutes);
      totalAtendidosComTempo++;
      if (diffMinutes <= 5) {
        sla5MinCount++;
      }
    }
  }

  // Calculate Median
  let medianMinutes = 0;
  if (responseTimes.length > 0) {
    responseTimes.sort((a, b) => a - b);
    const mid = Math.floor(responseTimes.length / 2);
    medianMinutes = responseTimes.length % 2 !== 0 ? responseTimes[mid] : (responseTimes[mid - 1] + responseTimes[mid]) / 2;
  }

  // Top Campaign
  let topCampaign = null;
  let maxCampCount = 0;
  for (const [name, count] of campaignMap.entries()) {
    if (count > maxCampCount) {
      maxCampCount = count;
      topCampaign = { nome: name, count };
    }
  }

  // Race kart
  const race = Array.from(brokerMap.values())
    .map(b => {
      const meta = 10; // fixed meta for now
      return {
        corretor_id: b.name,
        nome: b.name,
        iniciais: b.name.substring(0, 2).toUpperCase(),
        position: 0,
        percent: Math.min(100, Math.round((b.visitas / meta) * 100)),
        visitas: b.visitas,
        meta: meta
      };
    })
    .sort((a, b) => b.visitas - a.visitas)
    .map((b, idx) => ({ ...b, position: idx + 1 }));

  return {
    kpis: {
      leads_hoje: { total: leadsHojeMeta + leadsHojeOutros, meta: leadsHojeMeta, outros: leadsHojeOutros },
      leads_mes: { total: leadsMesMeta + leadsMesOutros, meta: leadsMesMeta, outros: leadsMesOutros },
      sem_dono: semDono,
      sla_5min: { 
        percent: totalAtendidosComTempo > 0 ? Math.round((sla5MinCount / totalAtendidosComTempo) * 100) : 0, 
        atendidos: sla5MinCount, 
        total_atendidos_periodo: totalAtendidosComTempo 
      },
      visitas: { total: visitas, meta: 50 },
      fechamentos: { total: fecharam, meta: 10 }
    },
    funnel: {
      entraram,
      atendidos,
      qualificados,
      visitas,
      propostas,
      fecharam,
      metaPercent: leads.length > 0 ? Math.round((leads.filter(l => l.origem === 'META').length / leads.length) * 100) : 0,
      outrosPercent: leads.length > 0 ? Math.round((leads.filter(l => l.origem !== 'META').length / leads.length) * 100) : 0,
      tempoMedioPrimeiroContato: Math.round(medianMinutes * 60) // in seconds for the frontend to format
    },
    race,
    ticker,
    campanhaLider: topCampaign,
    plantao: { atual: 'Equipe', proximo: '-' },
    fila: semDono
  };
}
