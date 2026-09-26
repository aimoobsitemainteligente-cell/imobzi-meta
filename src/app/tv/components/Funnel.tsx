import { FunnelStats } from '@/lib/tv/types';
import { BarChart3, SignalHigh } from 'lucide-react';

interface FunnelProps {
  stats: FunnelStats;
  view: 'GERAL' | 'META';
}

export function Funnel({ stats, view }: FunnelProps) {
  const stages = [
    { name: 'ENTRARAM', count: stats.entraram },
    { name: 'ATENDIDOS', count: stats.atendidos },
    { name: 'QUALIFICADOS', count: stats.qualificados },
    { name: 'VISITAS', count: stats.visitas },
    { name: 'PROPOSTAS', count: stats.propostas },
    { name: 'FECHARAM', count: stats.fecharam }
  ];

  return (
    <div className="h-full bg-[#121820] border border-slate-800 rounded-xl p-6 flex flex-col justify-between">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-slate-300 tracking-wide uppercase">
          FUNIL DO PERÍODO
        </h2>
        <div className="flex bg-slate-900 rounded-full border border-slate-700 p-0.5">
          <button className={`text-xs font-bold px-4 py-1.5 rounded-full transition-colors ${view === 'GERAL' ? 'bg-teal-500/10 text-teal-400 border border-teal-500/30' : 'text-slate-500'}`}>GERAL</button>
          <button className={`text-xs font-bold px-4 py-1.5 rounded-full transition-colors ${view === 'META' ? 'bg-teal-500/10 text-teal-400 border border-teal-500/30' : 'text-slate-500'}`}>LEAD META BUSINESS</button>
        </div>
      </div>

      {/* Chevrons Funnel */}
      <div className="flex h-32 relative">
        {stages.map((stage, i) => {
          const isFirst = i === 0;
          const isLast = i === stages.length - 1;
          
          return (
            <div 
              key={stage.name} 
              className="flex-1 flex flex-col items-center justify-center relative -ml-4 first:ml-0"
              style={{
                background: isFirst ? 'rgba(46, 230, 166, 0.05)' : 'rgba(255,255,255,0.02)',
                border: isFirst ? '1px solid rgba(46, 230, 166, 0.2)' : '1px solid rgba(255,255,255,0.05)',
                clipPath: isFirst 
                  ? 'polygon(0% 0%, 85% 0%, 100% 50%, 85% 100%, 0% 100%)' 
                  : isLast 
                  ? 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%, 15% 50%)'
                  : 'polygon(0% 0%, 85% 0%, 100% 50%, 85% 100%, 0% 100%, 15% 50%)'
              }}
            >
              <div className="text-[10px] font-bold text-slate-400 mb-1 z-10">{stage.name}</div>
              <div className={`text-4xl font-bold z-10 ${isFirst ? 'text-teal-400' : 'text-white'}`}>{stage.count}</div>
            </div>
          );
        })}
      </div>
      
      {/* Conversions row */}
      <div className="flex justify-between items-center px-12 py-3 border border-slate-800 rounded-lg bg-slate-900/30 mt-4 text-sm font-semibold text-slate-400">
        {stages.slice(0, -1).map((stage, i) => {
          const nextCount = stages[i+1].count;
          const conv = stage.count > 0 ? Math.round((nextCount / stage.count) * 100) : 0;
          return (
            <div key={i} className="flex items-center gap-6">
              <span className="text-slate-300">{conv}%</span>
              {i < stages.length - 2 && <span>&rarr;</span>}
            </div>
          );
        })}
        <span>&rarr;</span>
        <span className="text-slate-300">
          {stages[4].count > 0 ? Math.round((stages[5].count / stages[4].count) * 100) : 0}%
        </span>
      </div>

      <div className="flex justify-between items-center mt-4 text-sm px-2">
        <div className="flex gap-8">
          <div className="flex items-center gap-3">
            <BarChart3 className="text-teal-400 w-6 h-6" />
            <div>
              <div className="text-slate-400 text-xs">Lead Meta Business</div>
              <div className="font-semibold text-white">{Math.round(stats.entraram * (stats.metaPercent/100))} leads</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <SignalHigh className="text-amber-500 w-6 h-6" />
            <div>
              <div className="text-slate-400 text-xs">Outros</div>
              <div className="font-semibold text-white">{Math.round(stats.entraram * (stats.outrosPercent/100))} leads</div>
            </div>
          </div>
        </div>
        <div className="text-right border-l border-slate-700 pl-6">
          <div className="text-slate-400 text-xs">tempo mediano 1º contato</div>
          <div className="font-bold text-teal-400 text-lg">{Math.floor(stats.tempoMedioPrimeiroContato / 60)}m{stats.tempoMedioPrimeiroContato % 60}s</div>
        </div>
      </div>
    </div>
  );
}
