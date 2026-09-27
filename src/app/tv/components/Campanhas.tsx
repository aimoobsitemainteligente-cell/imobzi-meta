import { TvDashboardData } from '@/lib/tv/types';

interface CampanhasProps {
  campanhas?: TvDashboardData['campanhas'];
  theme: any;
}

export function Campanhas({ campanhas, theme }: CampanhasProps) {
  if (!campanhas || campanhas.length === 0) return null;

  return (
    <div className="mt-4 flex flex-col gap-2">
      <div className="text-xs font-bold tracking-widest text-slate-500 uppercase">Top Campanhas (Meta Ads)</div>
      <div className="flex flex-col gap-2">
        {campanhas.slice(0, 3).map((camp, i) => (
          <div key={i} className="flex items-center justify-between bg-slate-800/40 border border-slate-700/50 rounded-md px-3 py-2 shadow-sm">
            <span className="text-xs uppercase font-bold text-slate-300 max-w-[200px] truncate" title={camp.nome}>
              {camp.nome || 'Desconhecida'}
            </span>
            <div className="flex gap-4">
              <div className="flex flex-col items-center">
                <span className="text-[10px] text-slate-500 font-bold uppercase">Leads</span>
                <span className="text-sm font-black text-slate-200" style={{ color: theme.accent }}>{camp.leads}</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-[10px] text-slate-500 font-bold uppercase">Visitas</span>
                <span className="text-sm font-black text-blue-400">{camp.visitas}</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-[10px] text-slate-500 font-bold uppercase">Ganhos</span>
                <span className="text-sm font-black text-green-400">{camp.fechamentos}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
