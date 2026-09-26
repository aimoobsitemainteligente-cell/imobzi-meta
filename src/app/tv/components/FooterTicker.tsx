import { TvDashboardData, Period } from '@/lib/tv/types';
import { UserCheck } from 'lucide-react';

interface FooterTickerProps {
  campanhaLider: TvDashboardData['campanhaLider'];
  ticker: TvDashboardData['ticker'];
  plantao: TvDashboardData['plantao'];
  period: Period;
  theme: any;
}

export function FooterTicker({ campanhaLider, ticker, plantao, period, theme }: FooterTickerProps) {
  
  const getStageColor = (estagio: string) => {
    switch (estagio) {
      case 'Novo': return 'text-slate-300 border-slate-600 bg-slate-800/50';
      case 'Em contato': return 'text-amber-400 border-amber-500/30 bg-amber-500/10';
      case 'Qualificado': return 'text-teal-400 border-teal-500/30 bg-teal-500/10';
      case 'Visita': return 'text-blue-400 border-blue-500/30 bg-blue-500/10';
      default: return 'text-slate-400 border-slate-700 bg-slate-800';
    }
  };

  return (
    <div className="h-[12vh] flex items-center px-8 border-t border-slate-800 bg-transparent">
      
      <div className="w-1/4 flex flex-col justify-center">
        <div className="text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider transition-colors duration-200">
          CAMPANHA LÍDER {period} ·
        </div>
        <div className="text-sm font-semibold text-slate-300 flex items-center gap-2">
          {campanhaLider ? campanhaLider.nome : '—'}
          {campanhaLider && <span className="text-[var(--accent)] transition-colors duration-200">• {campanhaLider.count} leads</span>}
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex items-center relative h-full">
        <div className="animate-ticker flex whitespace-nowrap items-center gap-6">
          {ticker.map((t, i) => (
            <div key={`${t.lead_id}-${i}`} className={`flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-full border ${getStageColor(t.estagio)}`}>
              <span className="font-bold">{t.nome_mascarado}</span>
              <span className="opacity-50">·</span>
              <span>{t.estagio}</span>
              <span className="opacity-50">·</span>
              <span>{t.time_ago}</span>
            </div>
          ))}
          {ticker.map((t, i) => (
            <div key={`dup-${t.lead_id}-${i}`} className={`flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-full border ${getStageColor(t.estagio)}`}>
              <span className="font-bold">{t.nome_mascarado}</span>
              <span className="opacity-50">·</span>
              <span>{t.estagio}</span>
              <span className="opacity-50">·</span>
              <span>{t.time_ago}</span>
            </div>
          ))}
        </div>
      </div>

      {plantao.atual && plantao.atual !== '-' && (
        <div className="w-1/4 flex justify-end items-center gap-4 text-sm font-semibold text-slate-400">
          <UserCheck className="w-5 h-5 text-[var(--accent)] transition-colors duration-200" />
          <div>
            plantão: <span className="text-[var(--accent)] transition-colors duration-200">{plantao.atual}</span>
          </div>
          {plantao.proximo && plantao.proximo !== '-' && (
            <>
              <div className="opacity-50">•</div>
              <div>
                próximo: <span className="text-amber-500">{plantao.proximo}</span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
