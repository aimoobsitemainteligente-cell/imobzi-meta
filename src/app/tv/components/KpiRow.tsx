import { Kpis, Period } from '@/lib/tv/types';

interface KpiRowProps {
  kpis: Kpis;
  period: Period;
  theme: any;
}

export function KpiRow({ kpis, period, theme }: KpiRowProps) {
  return (
    <div className="h-[18vh] px-8 py-4 grid grid-cols-5 gap-6">
      <KpiCard
        title={`LEADS ${period.toUpperCase()}`}
        value={kpis.leads.total}
        sub={`${kpis.leads.meta} Lead Meta Business · ${kpis.leads.outros} outros`}
        valueColor="text-[var(--accent)]"
      />
      <KpiCard
        title="SEM DONO"
        value={kpis.sem_dono}
        sub="fila agora"
        alert={kpis.sem_dono > 0}
      />
      <KpiCard
        title="SLA 5 MIN"
        value={`${kpis.sla_5min.percent}%`}
        sub={`${kpis.sla_5min.atendidos} de ${kpis.sla_5min.total_atendidos_periodo} atendidos`}
        valueColor="text-[var(--accent)]"
      />
      <KpiCard
        title="VISITAS"
        value={kpis.visitas.total}
        sub={`meta ${kpis.visitas.meta}`}
        valueColor="text-[var(--accent)]"
      />
      <KpiCard
        title="FECHARAM"
        value={kpis.fechamentos.total}
        sub={`meta ${kpis.fechamentos.meta} · sem valor`}
        valueColor="text-[var(--accent)]"
      />
    </div>
  );
}

function KpiCard({ title, value, sub, alert, valueColor }: { title: string, value: string | number, sub: string, alert?: boolean, valueColor?: string }) {
  return (
    <div className={`rounded-xl flex flex-col justify-center items-center text-center p-6 border bg-[#121820] shadow-sm ${alert ? 'border-red-500/50' : 'border-slate-800'}`}>
      <div className={`text-xs font-semibold tracking-wider mb-2 ${alert ? 'text-slate-300' : 'text-slate-400'}`}>
        {title}
      </div>
      <div className={`text-6xl font-bold tracking-tight mb-2 transition-colors duration-200 ${alert ? 'text-[#FF4D6A]' : valueColor || 'text-white'}`}>
        {value}
      </div>
      <div className="text-slate-400 text-sm">
        {sub}
      </div>
    </div>
  );
}
