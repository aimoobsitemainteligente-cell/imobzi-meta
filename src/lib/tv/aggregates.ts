import { TvDashboardData, Period } from './types';
import { getStartOfPeriodSP, parseFromSP } from '../time';

export function calculateDashboardData(leads: any[], period: Period = 'hoje'): TvDashboardData {
  const startOfToday = getStartOfPeriodSP('hoje');
  const startOfWeek = getStartOfPeriodSP('semana');
  const startOfMonth = getStartOfPeriodSP('mes');

  let leadsMeta = 0;
  let leadsOutros = 0;
  let semDono = 0;
  
  let entraram = 0;
  let atendidos = 0;
  let qualificados = 0;
  let visitas = 0;
  let propostas = 0;
  let fecharam = 0;
  
  const brokerMap = new Map<string, { visitas: number, name: string }>();
  const campaignMap = new Map<string, number>();

  // Helper para normalizar strings
  const normalize = (s: string) => (s || '').trim().toLowerCase();

  // Helper para parsear DD/MM/YYYY HH:MM vindo do Google Sheets (Brasil)
  const parseDateTime = (dateTimeStr: string) => {
    if (!dateTimeStr) return 0;
    if (dateTimeStr.includes('T')) {
      const ms = new Date(dateTimeStr).getTime();
      return isNaN(ms) ? 0 : ms;
    }
    
    const [datePart, timePart] = dateTimeStr.split(' ');
    const parsed = parseFromSP(datePart, timePart);
    return parsed || 0;
  };

  const responseTimes: number[] = [];
  let sla5MinCount = 0;
  let totalAtendidosComTempo = 0;

  // Sort leads for ticker (newest first), dedup by lead_id, ignore empty/placeholders
  const ticker: { lead_id: string, nome_mascarado: string, estagio: string, time_ago: string }[] = [];
  const seenIds = new Set<string>();

  for (const l of [...leads].reverse()) {
    if (ticker.length >= 10) break; // keep up to 10
    if (seenIds.has(l.lead_id)) continue;
    
    const nameStr = (l.nome || '').trim();
    if (!nameStr || nameStr.toLowerCase() === 'nome_do_lead' || nameStr.includes('{')) continue;

    seenIds.add(l.lead_id);
    
    // mask name: "Wesley" -> "W***"
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

  const isDateInPeriod = (dateMs: number, period: Period) => {
    if (period === 'todo_periodo') return true;
    if (period === 'hoje') return dateMs >= startOfToday;
    if (period === 'semana') return dateMs >= startOfWeek;
    if (period === 'mes') return dateMs >= startOfMonth;
    if (period === 'trimestre') return dateMs >= getStartOfPeriodSP('trimestre');
    return true;
  };

  for (const lead of leads) {
    const corretor = (lead.corretor_nome || '').trim();
    const isSemDono = !corretor || corretor.toLowerCase() === 'sem dono';
    const status = normalize(lead.status);
    
    // SEM DONO é sempre a fila de agora, independente do período
    if (isSemDono && status === 'novo') {
      semDono++;
    }

    const createdTime = parseDateTime(lead.created_at);
    if (createdTime === 0) continue;
    
    // Filter by period for everything else
    if (!isDateInPeriod(createdTime, period)) {
      continue;
    }
    
    entraram++;

    if (lead.origem === 'META') leadsMeta++;
    else leadsOutros++;
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
    let primeiroContatoStr = '';
    if (lead.primeiro_contato_data) {
      primeiroContatoStr = `${lead.primeiro_contato_data} ${lead.primeiro_contato_hora || '00:00'}`;
    }
    const contatoTime = parseDateTime(primeiroContatoStr);
    
    if (contatoTime > createdTime) {
      const diffMinutes = (contatoTime - createdTime) / 1000 / 60;
      responseTimes.push(diffMinutes);
      totalAtendidosComTempo++;
      if (diffMinutes <= 5) {
        sla5MinCount++;
      }
    }
  }

  // Calculate metas based on period
  const metaVisitasMes = 50;
  const metaFecharamMes = 10;
  
  let metaVisitas = metaVisitasMes;
  let metaFecharam = metaFecharamMes;
  
  if (period === 'hoje') {
    metaVisitas = Math.ceil(metaVisitasMes / 30); // 30 is default
    metaFecharam = Math.ceil(metaFecharamMes / 30);
  } else if (period === 'semana') {
    metaVisitas = Math.ceil(metaVisitasMes / 4);
    metaFecharam = Math.ceil(metaFecharamMes / 4);
  } else if (period === 'trimestre') {
    metaVisitas = metaVisitasMes * 3; // Approx 3 months of data usually
    metaFecharam = metaFecharamMes * 3;
  } else if (period === 'todo_periodo') {
    metaVisitas = metaVisitasMes * 12; // Approx 1 year for all time
    metaFecharam = metaFecharamMes * 12;
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

  // Calculate Race Kart (this is ALWAYS month calendar)
  // Re-run for brokerMap but only for current month
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
      const meta = 10; // fixed monthly meta per broker for now
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
    period,
    kpis: {
      leads: { total: leadsMeta + leadsOutros, meta: leadsMeta, outros: leadsOutros },
      sem_dono: semDono,
      sla_5min: { 
        percent: totalAtendidosComTempo > 0 ? Math.round((sla5MinCount / totalAtendidosComTempo) * 100) : 0, 
        atendidos: sla5MinCount, 
        total_atendidos_periodo: totalAtendidosComTempo 
      },
      visitas: { total: visitas, meta: metaVisitas },
      fechamentos: { total: fecharam, meta: metaFecharam }
    },
    funnel: {
      entraram,
      atendidos,
      qualificados,
      visitas,
      propostas,
      fecharam,
      metaPercent: entraram > 0 ? Math.round((leadsMeta / entraram) * 100) : 0,
      outrosPercent: entraram > 0 ? Math.round((leadsOutros / entraram) * 100) : 0,
      tempoMedioPrimeiroContato: Math.round(medianMinutes * 60) // in seconds for the frontend to format
    },
    race,
    ticker,
    campanhaLider: topCampaign,
    plantao: { atual: 'Equipe', proximo: '-' },
    fila: semDono
  };
}
