import { TvDashboardData, Period } from './types';
import { getStartOfPeriodSP, parseFromSP } from '../time';


function calcFunnel(filteredLeads: any[], allLeadsForPercent: any[]) {
  let entraram = 0;
  let atendidos = 0;
  let qualificados = 0;
  let visitas = 0;
  let propostas = 0;
  let fecharam = 0;
  let leadsMeta = 0;
  let leadsOutros = 0;
  
  const responseTimes: number[] = [];
  
  for (const lead of filteredLeads) {
    entraram++;
    
    const status = (lead.status || '').toLowerCase().trim();
    const corretor = (lead.corretor_nome || '').trim();
    
    if (lead.origem === 'META') leadsMeta++;
    else leadsOutros++;
    
    const hasStatus = status !== '' && status !== 'novo';
    const hasCorretor = corretor !== '' && corretor.toLowerCase() !== 'sem dono';
    
    if (hasStatus || hasCorretor) atendidos++;
    
    if (['em negociação', 'visita agendada', 'proposta', 'ganho'].includes(status)) {
      qualificados++;
    }

    if (['visita agendada', 'proposta', 'ganho'].includes(status)) visitas++;
    if (['proposta', 'ganho'].includes(status)) propostas++;
    if (status === 'ganho') fecharam++;

    const createdTime = parseDateTime(lead.created_at);
    let primeiroContatoStr = '';
    if (lead.primeiro_contato_data) {
      primeiroContatoStr = `${lead.primeiro_contato_data} ${lead.primeiro_contato_hora || '00:00'}`;
    }
    const contatoTime = parseDateTime(primeiroContatoStr);
    
    if (contatoTime > createdTime) {
      const diffMinutes = (contatoTime - createdTime) / 1000 / 60;
      responseTimes.push(diffMinutes);
    }
  }
  
  let medianMinutes = 0;
  if (responseTimes.length > 0) {
    responseTimes.sort((a, b) => a - b);
    const mid = Math.floor(responseTimes.length / 2);
    medianMinutes = responseTimes.length % 2 !== 0 ? responseTimes[mid] : (responseTimes[mid - 1] + responseTimes[mid]) / 2;
  }
  
  return {
    entraram,
    atendidos,
    qualificados,
    visitas,
    propostas,
    fecharam,
    metaPercent: allLeadsForPercent.length > 0 ? Math.round((allLeadsForPercent.filter(l => l.origem === 'META').length / allLeadsForPercent.length) * 100) : 0,
    outrosPercent: allLeadsForPercent.length > 0 ? Math.round((allLeadsForPercent.filter(l => l.origem !== 'META').length / allLeadsForPercent.length) * 100) : 0,
    tempoMedioPrimeiroContato: Math.round(medianMinutes * 60)
  };
}

export function calculateDashboardData(leads: any[], period: Period = 'hoje'): TvDashboardData {
  const startOfToday = getStartOfPeriodSP('hoje');
  const startOfWeek = getStartOfPeriodSP('semana');
  const startOfMonth = getStartOfPeriodSP('mes');

  let leadsMeta = 0;
  let leadsOutros = 0;
  let semDono = 0;
  
  const brokerMap = new Map<string, { visitas: number, name: string }>();
  const campaignMap = new Map<string, number>();
  
  let sla5MinCount = 0;
  let totalAtendidosComTempo = 0;
  
  const ticker: any[] = [];
  
  const normalize = (s: string) => (s || '').toLowerCase().trim();
  const seenIds = new Set<string>();
  
  const validLeadsInPeriod = [];

  const isDateInPeriod = (dateMs: number, period: Period) => {
    if (period === 'todo_periodo') return true;
    if (period === 'hoje') return dateMs >= startOfToday;
    if (period === 'semana') return dateMs >= startOfWeek;
    if (period === 'mes') return dateMs >= startOfMonth;
    if (period === 'trimestre') return dateMs >= getStartOfPeriodSP('trimestre');
    return true;
  };

  // Pre-filter leads for the period
  for (const l of leads) {
    const createdTime = parseDateTime(l.created_at);
    if (createdTime === 0) continue;
    
    const corretor = (l.corretor_nome || '').trim();
    const isSemDono = !corretor || corretor.toLowerCase() === 'sem dono';
    const status = normalize(l.status);
    
    if (isSemDono && status === 'novo') semDono++;
    
    if (isDateInPeriod(createdTime, period)) {
      validLeadsInPeriod.push(l);
      
      if (l.origem === 'META') leadsMeta++;
      else leadsOutros++;
      
      let primeiroContatoStr = '';
      if (l.primeiro_contato_data) {
        primeiroContatoStr = `${l.primeiro_contato_data} ${l.primeiro_contato_hora || '00:00'}`;
      }
      const contatoTime = parseDateTime(primeiroContatoStr);
      if (contatoTime > createdTime) {
        const diffMinutes = (contatoTime - createdTime) / 1000 / 60;
        totalAtendidosComTempo++;
        if (diffMinutes <= 5) sla5MinCount++;
      }
      
      if (['visita agendada', 'proposta', 'ganho'].includes(status)) {
        if (corretor && corretor.toLowerCase() !== 'sem dono') {
          const b = brokerMap.get(corretor) || { visitas: 0, name: corretor };
          b.visitas++;
          brokerMap.set(corretor, b);
        }
      }
      
      const adName = (l.ad_name || '').trim();
      if (adName) {
        campaignMap.set(adName, (campaignMap.get(adName) || 0) + 1);
      }
    }
  }

  // Generate Ticker
  for (const l of leads.slice(0, 150)) {
    if (seenIds.has(l.lead_id)) continue;
    const nameStr = (l.nome || '').trim();
    if (!nameStr || nameStr.toLowerCase() === 'nome_do_lead' || nameStr.includes('{')) continue;
    seenIds.add(l.lead_id);
    const nameParts = nameStr.split(' ');
    const firstName = nameParts[0];
    const masked = firstName.length > 1 ? firstName[0] + '***' : '***';
    const finalName = nameParts.length > 1 ? `${masked} ${nameParts[nameParts.length - 1]}` : masked;
    ticker.push({
      lead_id: l.lead_id,
      nome_mascarado: finalName,
      estagio: l.status || 'Novo',
      time_ago: l.created_at.split(' ')[1] || 'Recente'
    });
  }

  // Calculate metas based on period
  const metaVisitasMes = 50;
  const metaFecharamMes = 10;
  let metaVisitas = metaVisitasMes;
  let metaFecharam = metaFecharamMes;
  if (period === 'hoje') {
    metaVisitas = Math.ceil(metaVisitasMes / 30);
    metaFecharam = Math.ceil(metaFecharamMes / 30);
  } else if (period === 'semana') {
    metaVisitas = Math.ceil(metaVisitasMes / 4);
    metaFecharam = Math.ceil(metaFecharamMes / 4);
  } else if (period === 'trimestre') {
    metaVisitas = metaVisitasMes * 3;
    metaFecharam = metaFecharamMes * 3;
  } else if (period === 'todo_periodo') {
    metaVisitas = metaVisitasMes * 12;
    metaFecharam = metaFecharamMes * 12;
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

  // Calculate Race Kart (this is ALWAYS month calendar)
  const raceBrokerMap = new Map<string, { visitas: number, name: string }>();
  for (const lead of leads) {
    const createdTime = parseDateTime(lead.created_at);
    if (createdTime === 0 || createdTime < startOfMonth) continue;
    const status = normalize(lead.status);
    const corretor = (lead.corretor_nome || '').trim();
    if (['visita agendada', 'proposta', 'ganho'].includes(status) && corretor && corretor.toLowerCase() !== 'sem dono') {
      const b = raceBrokerMap.get(corretor) || { visitas: 0, name: corretor };
      b.visitas++;
      raceBrokerMap.set(corretor, b);
    }
  }

  const race = Array.from(raceBrokerMap.values())
    .map(b => {
      const meta = 10;
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

  // CALCULATE FUNNELS
  const funnelGeral = calcFunnel(validLeadsInPeriod, validLeadsInPeriod);
  const funnelMeta = calcFunnel(validLeadsInPeriod.filter(l => l.origem === 'META'), validLeadsInPeriod);

  return {
    period,
    kpis: {
      leads: { total: leadsMeta + leadsOutros, meta: leadsMeta, outros: leadsOutros },
      sem_dono: semDono,
      sla_5min: { 
        percent: totalAtendidosComTempo > 0 ? Math.round((sla5MinCount / totalAtendidosComTempo) * 100) : 0, 
        atendidos: sla5MinCount, 
        total_atendidos_periodo: totalAtendidosComTempo 
      },
      visitas: { total: funnelGeral.visitas, meta: metaVisitas },
      fechamentos: { total: funnelGeral.fecharam, meta: metaFecharam }
    },
    funnel: funnelGeral,
    funnelMeta: funnelMeta,
    race,
    ticker,
    campanhaLider: topCampaign,
    plantao: { atual: 'Equipe', proximo: '-' },
    fila: semDono
  };
}
