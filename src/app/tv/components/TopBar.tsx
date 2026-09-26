import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Clock } from 'lucide-react';

interface TopBarProps {
  periodo: 'HOJE' | 'SEMANA' | 'MES';
  lastUpdate: Date;
  currentTime: Date;
}

export function TopBar({ periodo, lastUpdate, currentTime }: TopBarProps) {
  const agencyName = process.env.NEXT_PUBLIC_AGENCY_NAME || 'IMOBILIÁRIA';

  return (
    <div className="h-[8vh] flex items-center justify-between px-8 bg-transparent border-b border-slate-800/50">
      <div className="text-sm font-semibold text-slate-400 tracking-widest uppercase">
        {agencyName} · TV
      </div>

      <div className="flex bg-[#121820] rounded-full border border-slate-700 p-0.5">
        {['HOJE', 'SEMANA', 'MES'].map((p) => (
          <div
            key={p}
            className={`px-8 py-1.5 rounded-full text-xs font-bold tracking-wider transition-colors ${
              periodo === p ? 'bg-teal-500/10 text-teal-400 border border-teal-500/30' : 'text-slate-500'
            }`}
          >
            {p}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-6 text-slate-400 text-sm font-medium">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
          ao vivo
        </div>
        <div>
          atualizado há {Math.max(0, Math.floor((currentTime.getTime() - lastUpdate.getTime()) / 1000))}s
        </div>
        <div className="flex items-center gap-2 text-white font-semibold">
          <Clock className="w-4 h-4 text-slate-400" />
          {format(currentTime, 'HH:mm', { locale: ptBR })}
        </div>
      </div>
    </div>
  );
}
