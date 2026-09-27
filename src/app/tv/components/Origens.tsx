import { TvDashboardData } from '@/lib/tv/types';

interface OrigensProps {
  origens?: TvDashboardData['origens'];
  theme: any;
}

export function Origens({ origens, theme }: OrigensProps) {
  if (!origens || origens.length === 0) return null;

  return (
    <div className="mt-4 flex flex-col gap-2">
      <div className="text-xs font-bold tracking-widest text-slate-500 uppercase">Mídia de Origem</div>
      <div className="flex flex-wrap gap-2">
        {origens.map((origem, i) => (
          <div key={i} className="flex items-center gap-2 bg-slate-800/40 border border-slate-700/50 rounded-md px-3 py-1.5 shadow-sm">
            <span className="text-[10px] uppercase font-bold text-slate-400">{origem.nome}</span>
            <span className="text-sm font-black text-slate-200" style={{ color: theme.accent }}>{origem.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
