export type LeadStage = 'Novo' | 'Atribuido' | 'Em contato' | 'Qualificado' | 'Visita' | 'Proposta' | 'Ganho' | 'Perdido' | 'Desqualificado';

export interface Lead {
  lead_id: string;
  meta_lead_id?: string;
  origem: 'META' | 'CRM' | 'MANUAL';
  canal?: string;
  form_id?: string;
  ad_id?: string;
  campaign_id?: string;
  campaign_name?: string;
  created_at: string;
  received_at?: string;
  nome: string;
  estagio: LeadStage;
  corretor_id?: string;
  corretor_nome?: string;
  atendido_em?: string;
  primeiro_contato_em?: string;
  status_final?: string;
  updated_at?: string;
}

export type EventType = 'LEAD_CRIOU' | 'LEAD_ATRIBUIU' | 'LEAD_ATENDEU' | 'ESTAGIO_MUDOU' | 'VISITA' | 'PROPOSTA' | 'FECHOU' | 'PERDEU';

export interface SheetEvent {
  event_id: string;
  tipo: EventType;
  lead_id: string;
  ator?: string;
  created_at: string;
  payload?: string; // JSON
}

export interface Corretor {
  corretor_id: string;
  nome: string;
  iniciais: string;
  ativo: boolean;
  plantao: boolean;
  proximo_plantao: boolean;
  ordem: number;
}

export interface Meta {
  periodo: string; // YYYY-MM
  corretor_id: string;
  meta_visitas: number;
  meta_propostas: number;
  meta_fechamentos: number;
}

export interface Campanha {
  campaign_id: string;
  nome_comercial: string;
  ativo: boolean;
}

// Derived Types for TV Dashboard
export interface Kpis {
  leads_hoje: { total: number, meta: number, outros: number };
  sem_dono: number;
  sla_5min: { percent: number, atendidos: number, total_atendidos_periodo: number };
  visitas: { total: number, meta: number };
  fechamentos: { total: number, meta: number };
}

export interface FunnelStats {
  entraram: number;
  atendidos: number;
  qualificados: number;
  visitas: number;
  propostas: number;
  fecharam: number;
  metaPercent: number; // % from META
  outrosPercent: number; // % from outros
  tempoMedioPrimeiroContato: number; // in seconds
}

export interface RaceKart {
  corretor_id: string;
  nome: string;
  iniciais: string;
  position: number;
  percent: number; // based on visits vs meta
  visitas: number;
  meta: number;
  boost?: boolean; // if event in last 60s
}

export interface TvDashboardData {
  kpis: Kpis;
  funnel: FunnelStats;
  race: RaceKart[];
  ticker: { lead_id: string, nome_mascarado: string, estagio: string, time_ago: string }[];
  campanhaLider: { nome: string, count: number } | null;
  plantao: { atual?: string, proximo?: string };
  fila: number; // leads sem dono
}
