import { TvDashboardData } from './types';

export function calculateDashboardData(leads: any[]): TvDashboardData {
  const hoje = new Date().toLocaleDateString('pt-BR');
  
  // Count leads from today
  let leadsMeta = 0;
  let leadsOutros = 0;
  let semDono = 0;
  
  let entraram = leads.length;
  let atendidos = 0;
  let qualificados = 0;
  let visitas = 0;
  let propostas = 0;
  let fecharam = 0;
  
  const brokerMap = new Map<string, { visitas: number, name: string }>();

  // Helper para normalizar strings
  const normalize = (s: string) => (s || '').trim().toLowerCase();

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

  for (const lead of leads) {
    const dataCriacao = lead.created_at.split(' ')[0];
    
    if (dataCriacao === hoje) {
      if (lead.origem === 'META') leadsMeta++;
      else leadsOutros++;
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
      leads_hoje: { total: leadsMeta + leadsOutros, meta: leadsMeta, outros: leadsOutros },
      sem_dono: semDono,
      sla_5min: { percent: 0, atendidos: 0, total_atendidos_periodo: 0 }, // TODO
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
      tempoMedioPrimeiroContato: 0
    },
    race,
    ticker,
    campanhaLider: null,
    plantao: { atual: 'Equipe', proximo: '-' },
    fila: semDono
  };
}
