import { TvDashboardData, SheetEvent } from './types';

export const mockDashboardData: TvDashboardData = {
  kpis: {
    leads_hoje: { total: 45, meta: 35, outros: 10 },
    leads_mes: { total: 150, meta: 130, outros: 20 },
    sem_dono: 2,
    sla_5min: { percent: 85, atendidos: 38, total_atendidos_periodo: 45 },
    visitas: { total: 12, meta: 20 },
    fechamentos: { total: 3, meta: 8 }
  },
  funnel: {
    entraram: 100,
    atendidos: 90,
    qualificados: 60,
    visitas: 40,
    propostas: 20,
    fecharam: 5,
    metaPercent: 70,
    outrosPercent: 30,
    tempoMedioPrimeiroContato: 120
  },
  race: [
    { corretor_id: '1', nome: 'João', iniciais: 'JO', position: 1, percent: 80, visitas: 8, meta: 10, boost: true },
    { corretor_id: '2', nome: 'Maria', iniciais: 'MA', position: 2, percent: 50, visitas: 5, meta: 10 },
    { corretor_id: '3', nome: 'Carlos', iniciais: 'CA', position: 3, percent: 30, visitas: 3, meta: 10 },
    { corretor_id: '4', nome: 'Ana', iniciais: 'AN', position: 4, percent: 10, visitas: 1, meta: 10 }
  ],
  ticker: [
    { lead_id: '1', nome_mascarado: 'J*** Silva', estagio: 'Novo', time_ago: '12m' },
    { lead_id: '2', nome_mascarado: 'M*** Santos', estagio: 'Visita', time_ago: '40m' },
    { lead_id: '3', nome_mascarado: 'P*** Souza', estagio: 'Atribuido', time_ago: '2h' }
  ],
  campanhaLider: { nome: 'Lançamento Centro', count: 25 },
  plantao: { atual: 'João', proximo: 'Maria' },
  fila: 2
};

export const mockEvents: SheetEvent[] = [
  { event_id: 'e1', tipo: 'LEAD_CRIOU', lead_id: '101', created_at: new Date().toISOString(), payload: JSON.stringify({origem: 'META', nome: 'Pedro'}) },
  { event_id: 'e2', tipo: 'LEAD_ATENDEU', lead_id: '102', ator: 'João', created_at: new Date().toISOString(), payload: JSON.stringify({nome: 'Ana', tempo: '00:45'}) }
];
