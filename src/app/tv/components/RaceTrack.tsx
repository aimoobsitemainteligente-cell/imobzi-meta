import { RaceKart } from '@/lib/tv/types';
import { User, Car, Zap, Flag } from 'lucide-react';

interface RaceTrackProps {
  karts: RaceKart[];
}

export function RaceTrack({ karts }: RaceTrackProps) {
  const sorted = [...karts].sort((a, b) => a.position - b.position);

  return (
    <div className="h-full bg-[#121820] border border-slate-800 rounded-xl p-6 flex flex-col justify-between">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-slate-300 tracking-wide uppercase">
          RANKING DO MÊS <span className="text-slate-500 font-normal lowercase tracking-normal">· sla e conversão</span>
        </h2>
        <div className="flex items-center gap-2 text-sm text-slate-400 font-semibold">
          <Flag className="w-4 h-4 text-white" /> {karts[0]?.meta || 0} visitas
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-between py-2 relative">
        <div className="absolute right-[4rem] top-0 bottom-0 w-8 border-l-2 border-dashed border-slate-700 opacity-50" />
        
        {sorted.slice(0,4).map((kart) => {
          const isP1 = kart.position === 1;
          const isP2 = kart.position === 2;
          const isP3 = kart.position === 3;
          
          let pColor = 'border-slate-700 text-slate-400';
          if (isP1) pColor = 'border-teal-500/30 text-teal-400';
          else if (isP2) pColor = 'border-blue-400/30 text-blue-400';
          else if (isP3) pColor = 'border-amber-500/30 text-amber-500';

          return (
            <div key={kart.corretor_id} className="relative w-full flex items-center group py-2 border-b border-slate-800/50 last:border-0">
              <div className="flex items-center gap-3 w-32 shrink-0">
                <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
                  <User className="text-slate-400 w-5 h-5" />
                </div>
                <span className="font-semibold text-white truncate">{kart.nome}</span>
              </div>
              
              <div className="flex-1 relative mx-4 h-8 flex items-center">
                <div className="absolute left-0 right-16 h-0.5 bg-slate-800 border-t border-dashed border-slate-700" />
                
                <div className="flex items-center w-full relative h-full">
                  <div className="absolute transition-all duration-1000 flex items-center" style={{ left: `${Math.min(kart.percent, 100) * 0.8}%` }}>
                    <Car className={`w-5 h-5 mr-3 ${kart.boost ? 'text-amber-400' : 'text-teal-400'}`} />
                    <div className={`h-2 rounded-full w-24 ${kart.boost ? 'bg-amber-500' : isP1 || isP2 ? 'bg-teal-500' : 'bg-orange-500'}`} />
                    {kart.boost && (
                      <span className="ml-2 flex items-center text-amber-400 text-xs font-bold italic animate-pulse">
                        <Zap className="w-3 h-3 fill-amber-400 mr-1" /> boost
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="w-[180px] shrink-0 text-right flex items-center justify-end gap-3 font-semibold">
                <div className="flex flex-col items-end">
                  <span className="text-[10px] text-slate-500 font-bold uppercase">SLA Médio</span>
                  <span className={`text-sm ${kart.avgResponseTime > 0 && kart.avgResponseTime <= 10 ? 'text-green-400' : kart.avgResponseTime > 10 && kart.avgResponseTime <= 30 ? 'text-amber-400' : 'text-slate-300'}`}>
                    {kart.avgResponseTime > 0 ? `${kart.avgResponseTime} min` : 'N/A'}
                  </span>
                </div>
                <div className="flex flex-col items-end mr-2">
                  <span className="text-[10px] text-slate-500 font-bold uppercase">Visitas</span>
                  <span className="text-slate-300">{kart.visitas}/{kart.meta}</span>
                </div>
                <span className={`px-2 py-1 text-xs rounded border ${pColor}`}>P{kart.position}</span>
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="mt-4 pt-4 border-t border-slate-800 text-xs text-slate-500 flex items-center gap-2">
        <div className="w-6 h-3 bg-slate-800 border border-slate-700 rounded-sm" /> unidade da pista: visitas realizadas
      </div>
    </div>
  );
}
