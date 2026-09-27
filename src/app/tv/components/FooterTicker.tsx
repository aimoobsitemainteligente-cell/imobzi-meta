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
          {ticker.map((msg, i) => (
            <div key={`ticker-${i}`} className={`flex items-center gap-2 text-sm font-semibold px-5 py-2 rounded-full border border-slate-700 bg-slate-800/80 text-slate-300`}>
              {msg}
            </div>
          ))}
          {ticker.map((msg, i) => (
            <div key={`dup-ticker-${i}`} className={`flex items-center gap-2 text-sm font-semibold px-5 py-2 rounded-full border border-slate-700 bg-slate-800/80 text-slate-300`}>
              {msg}
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
