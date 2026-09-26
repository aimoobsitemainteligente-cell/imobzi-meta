'use client';

import { useEffect, useState, useCallback } from 'react';
import { TvDashboardData, SheetEvent, Period } from '@/lib/tv/types';
import { mockDashboardData, mockEvents } from '@/lib/tv/mock';
import { TopBar } from './components/TopBar';
import { KpiRow } from './components/KpiRow';
import { Funnel } from './components/Funnel';
import { RaceTrack } from './components/RaceTrack';
import { FooterTicker } from './components/FooterTicker';
import { ModalNewLead } from './components/ModalNewLead';
import { ModalAttended } from './components/ModalAttended';
import { AlertStrip } from './components/AlertStrip';

const PERIOD_THEME = {
  hoje: {
    id: "hoje",
    label: "Hoje",
    accent: "#2EE6A6",      // teal
    accentDim: "#2EE6A633",
    glow: "#2EE6A622",
    pillText: "#04251A",
  },
  semana: {
    id: "semana",
    label: "Semana",
    accent: "#6EA8FF",      // azul
    accentDim: "#6EA8FF33",
    glow: "#6EA8FF22",
    pillText: "#07101F",
  },
  mes: {
    id: "mes",
    label: "Mês",
    accent: "#F5B942",      // âmbar
    accentDim: "#F5B94233",
    glow: "#F5B94222",
    pillText: "#1A1303",
  },
  todo_periodo: {
    id: "todo_periodo",
    label: "Todo Período",
    accent: "#9D72FF",      // roxo
    accentDim: "#9D72FF33",
    glow: "#9D72FF22",
    pillText: "#1A0B2E",
  }
};

export function TvShell() {
  const [data, setData] = useState<TvDashboardData | null>(null);
  const [events, setEvents] = useState<SheetEvent[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [funnelView, setFunnelView] = useState<'GERAL' | 'META'>('GERAL');
  const [period, setPeriod] = useState<Period>('hoje');
  
  const [demoMode, setDemoMode] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/tv?period=${period}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
        setLastUpdate(new Date());
      } else {
        setData(mockDashboardData);
        setLastUpdate(new Date());
      }
    } catch {
      setData(mockDashboardData);
      setLastUpdate(new Date());
    }
  }, []);

  const fetchEvents = useCallback(async () => {
    try {
      const res = await fetch('/api/tv/events');
      if (res.ok) {
        const json = await res.json();
        setEvents(json);
      } else {
        setEvents(mockEvents);
      }
    } catch {
      setEvents(mockEvents);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const intervalData = setInterval(fetchData, 5000);
    const intervalEvents = setInterval(fetchEvents, 3000);
    return () => {
      clearInterval(intervalData);
      clearInterval(intervalEvents);
    };
  }, [fetchData, fetchEvents]);

  // Refetch data when period changes immediately
  useEffect(() => {
    fetchData();
  }, [period, fetchData]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const rot = setInterval(() => {
      if (data && data.fila === 0) {
        setFunnelView(v => v === 'GERAL' ? 'META' : 'GERAL');
      }
    }, 25000);
    return () => clearInterval(rot);
  }, [data?.fila]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      setDemoMode(params.get('demo'));
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'f' || e.key === 'F') {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
        } else {
          document.exitFullscreen().catch(() => {});
        }
      } else if (e.key === 'ArrowRight') {
        setPeriod(prev => {
          if (prev === 'hoje') return 'semana';
          if (prev === 'semana') return 'mes';
          if (prev === 'mes') return 'todo_periodo';
          return 'hoje';
        });
      } else if (e.key === 'ArrowLeft') {
        setPeriod(prev => {
          if (prev === 'hoje') return 'todo_periodo';
          if (prev === 'todo_periodo') return 'mes';
          if (prev === 'mes') return 'semana';
          return 'hoje';
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    const hideCursor = () => {
      document.body.style.cursor = 'none';
    };
    const showCursor = () => {
      document.body.style.cursor = 'default';
      clearTimeout(timeout);
      timeout = setTimeout(hideCursor, 3000);
    };
    window.addEventListener('mousemove', showCursor);
    timeout = setTimeout(hideCursor, 3000);
    return () => {
      window.removeEventListener('mousemove', showCursor);
      clearTimeout(timeout);
    };
  }, []);

  if (!data) {
    return <div className="h-screen w-screen bg-[#0B0F14] flex items-center justify-center text-white">Carregando...</div>;
  }

  const showDemoModal1 = demoMode === 'modal1';
  const showDemoModal2 = demoMode === 'modal2';
  
  // Use a view period para a interface (se a API retornou um fallback de mês, usamos ele para pintar)
  const viewPeriod = data.period || period;
  const theme = PERIOD_THEME[viewPeriod];

  return (
    <div 
      id="tv-root"
      className="h-screen w-screen bg-[#0B0F14] overflow-hidden font-sans text-slate-200 select-none transition-colors duration-200"
      style={{
        '--accent': theme.accent,
        '--accent-dim': theme.accentDim,
        '--glow': theme.glow,
        '--pill-text': theme.pillText,
      } as React.CSSProperties}
    >
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-[var(--accent)] transition-colors duration-200" />
      
      <AlertStrip count={data.fila} />
      
      <div className={`transition-transform duration-300 ${data.fila > 0 ? 'translate-y-[4vh]' : ''} h-full flex flex-col`}>
        <TopBar periodo={viewPeriod} setPeriodo={setPeriod} lastUpdate={lastUpdate} currentTime={currentTime} />
        <KpiRow kpis={data.kpis} period={viewPeriod} theme={theme} />
        
        <div className="h-[52vh] flex gap-6 px-8 py-2">
          <div className="w-[58%]">
            <Funnel stats={data.funnel} view={funnelView} period={viewPeriod} theme={theme} />
          </div>
          <div className="w-[42%]">
            <RaceTrack karts={data.race} />
          </div>
        </div>

        <div className="mt-auto">
          <FooterTicker campanhaLider={data.campanhaLider} ticker={data.ticker} plantao={data.plantao} period={viewPeriod} theme={theme} />
        </div>
      </div>

      {showDemoModal1 && (
        <ModalNewLead origem="META" nome="João Silva" createdAt={new Date(Date.now() - 45000)} />
      )}
      
      {showDemoModal2 && (
        <ModalAttended corretor="Maria" leadNome="Carlos Souza" tempo="00:32" />
      )}
    </div>
  );
}
