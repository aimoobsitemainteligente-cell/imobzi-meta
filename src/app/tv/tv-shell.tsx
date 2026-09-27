'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
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
import { Campanhas } from './components/Campanhas';

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
  trimestre: {
    id: "trimestre",
    label: "Trimestre",
    accent: "#9D72FF",      // roxo
    accentDim: "#9D72FF33",
    glow: "#9D72FF22",
    pillText: "#1A0B2E",
  },
  todo_periodo: {
    id: "todo_periodo",
    label: "Todo Período",
    accent: "#FF4D4D",      // vermelho suave
    accentDim: "#FF4D4D33",
    glow: "#FF4D4D22",
    pillText: "#2E0B0B",
  }
};

export function TvShell() {
  const [data, setData] = useState<TvDashboardData | null>(null);
  const [events, setEvents] = useState<SheetEvent[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [funnelView, setFunnelView] = useState<'GERAL' | 'META'>('META');
  const [period, setPeriod] = useState<Period>('hoje');
  
  const [demoMode, setDemoMode] = useState<string | null>(null);

  // Modal State
  const [activeModal, setActiveModal] = useState<{
    type: 'new' | 'attended';
    data: any;
  } | null>(null);

  const previousLeadsMap = useRef<Map<string, any>>(new Map());

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
  }, [period]);

  const syncData = useCallback(async () => {
    try {
      await fetch(`/api/tv/sync`);
    } catch (err) {
      console.error('Erro no sync background da TV:', err);
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
    syncData();
    
    const intervalData = setInterval(fetchData, 5000);
    const intervalSync = setInterval(syncData, 60000);
    const intervalEvents = setInterval(fetchEvents, 3000);
    return () => {
      clearInterval(intervalData);
      clearInterval(intervalSync);
      clearInterval(intervalEvents);
    };
  }, [fetchData, syncData, fetchEvents]);

  // Refetch data when period changes immediately
  useEffect(() => {
    fetchData();
  }, [period, fetchData]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Memory and Modal Logic
  useEffect(() => {
    if (!data?.latestLeads) return;

    let modalToTrigger: any = null;

    data.latestLeads.forEach(lead => {
      const prev = previousLeadsMap.current.get(lead.lead_id);
      
      if (!prev) {
        // We only trigger "new" if the memory was already initialized, 
        // to prevent firing on first load for all leads
        if (previousLeadsMap.current.size > 0) {
          modalToTrigger = { type: 'new', data: lead };
        }
      } else {
        const prevCorretor = prev.corretor_nome?.toLowerCase() || 'sem dono';
        const currCorretor = lead.corretor_nome?.toLowerCase() || 'sem dono';

        if ((prevCorretor === 'sem dono' || prevCorretor === '') && (currCorretor !== 'sem dono' && currCorretor !== '')) {
          // It was unassigned, now someone has it!
          modalToTrigger = { type: 'attended', data: lead };
        }
      }
      
      previousLeadsMap.current.set(lead.lead_id, lead);
    });

    if (modalToTrigger && !activeModal) {
      setActiveModal(modalToTrigger);
      setTimeout(() => setActiveModal(null), 8000); // hide after 8s
    }
  }, [data?.latestLeads]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      setDemoMode(params.get('demo'));
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // f ou F para fullscreen
      if (e.key === 'f' || e.key === 'F') {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
        } else {
          document.exitFullscreen().catch(() => {});
        }
      } else if (e.key === 'ArrowRight' || e.key === 'Right' || e.keyCode === 39) {
        setPeriod(prev => {
          const next = prev === 'hoje' ? 'semana' : prev === 'semana' ? 'mes' : prev === 'mes' ? 'trimestre' : prev === 'trimestre' ? 'todo_periodo' : 'hoje';
          return next;
        });
      } else if (e.key === 'ArrowLeft' || e.key === 'Left' || e.keyCode === 37) {
        setPeriod(prev => {
          const next = prev === 'hoje' ? 'todo_periodo' : prev === 'todo_periodo' ? 'trimestre' : prev === 'trimestre' ? 'mes' : prev === 'mes' ? 'semana' : 'hoje';
          return next;
        });
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
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
      
      <AlertStrip count={data.fila} coldCount={data.coldLeadsCount} />
      
      <div className={`transition-transform duration-300 ${data.fila > 0 ? 'translate-y-[4vh]' : ''} h-full flex flex-col`}>
        <TopBar periodo={viewPeriod} setPeriodo={setPeriod} lastUpdate={lastUpdate} currentTime={currentTime} />
        <KpiRow kpis={data.kpis} period={viewPeriod} theme={theme} />
        
        <div className="h-[52vh] flex gap-6 px-8 py-2">
          <div className="w-[58%] flex flex-col justify-between">
            <Funnel stats={data.funnel} view={funnelView} period={viewPeriod} theme={theme} />
            <Campanhas campanhas={data.campanhas} theme={theme} />
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

      {activeModal?.type === 'new' && (
        <ModalNewLead 
          origem={activeModal.data.origem || 'META'} 
          nome={activeModal.data.nome || 'Lead'} 
          createdAt={new Date(activeModal.data.created_at || Date.now())} 
        />
      )}

      {activeModal?.type === 'attended' && (
        <ModalAttended 
          corretor={activeModal.data.corretor_nome || 'Corretor'} 
          leadNome={activeModal.data.nome || 'Lead'} 
          tempo="--:--" 
        />
      )}
    </div>
  );
}
