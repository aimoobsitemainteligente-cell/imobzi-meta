import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Clock } from 'lucide-react';

import { Period } from '@/lib/tv/types';

interface TopBarProps {
  periodo: Period;
  setPeriodo: (p: Period) => void;
  lastUpdate: Date;
  currentTime: Date;
}

export function TopBar({ periodo, setPeriodo, lastUpdate, currentTime }: TopBarProps) {
  const agencyName = process.env.NEXT_PUBLIC_AGENCY_NAME || 'IMOBILIÁRIA';

  return (
    <div className="h-[8vh] flex items-center justify-between px-8 bg-transparent border-b border-slate-800/50">
      <div className="text-sm font-semibold text-slate-400 tracking-widest uppercase">
        {agencyName} · TV
      </div>

      <div className="flex bg-[#121820] rounded-full border border-slate-700 p-0.5 cursor-pointer">
        {(['hoje', 'semana', 'mes', 'todo_periodo'] as Period[]).map((p) => {
          const isActive = periodo === p;
          const label = p === 'todo_periodo' ? 'TODO PERÍODO' : p.toUpperCase();
          return (
            <div
              key={p}
              onClick={() => setPeriodo(p)}
              className={`px-8 py-1.5 rounded-full text-xs font-bold tracking-wider transition-all duration-200 ${
                isActive 
                  ? 'bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--accent-dim)]' 
                  : 'text-slate-500 hover:text-slate-200 bg-transparent border border-transparent'
              }`}
              style={isActive ? { color: 'var(--pill-text)', backgroundColor: 'var(--accent)' } : undefined}
            >
              {label}
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-6 text-slate-400 text-sm font-medium">
        <div className="flex items-center gap-2 text-[var(--accent)] transition-colors duration-200">
          <div className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse transition-colors duration-200" />
          ao vivo
        </div>
        <div className="transition-colors duration-200">
          atualizado {
            (() => {
              const diff = Math.max(0, Math.floor((currentTime.getTime() - lastUpdate.getTime()) / 1000));
              return diff < 5 ? <span className="text-[var(--accent)] font-semibold">agora</span> : `há ${diff}s`;
            })()
          }
        </div>
        <div className="flex items-center gap-2 text-white font-semibold">
          <Clock className="w-4 h-4 text-[var(--accent)] transition-colors duration-200" />
          {format(currentTime, 'HH:mm', { locale: ptBR })}
        </div>
      </div>
    </div>
  );
}
