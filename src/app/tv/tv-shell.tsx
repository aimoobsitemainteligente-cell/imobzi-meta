'use client';

import { useEffect, useState, useCallback } from 'react';
import { TvDashboardData, SheetEvent } from '@/lib/tv/types';
import { mockDashboardData, mockEvents } from '@/lib/tv/mock';
import { TopBar } from './components/TopBar';
import { KpiRow } from './components/KpiRow';
import { Funnel } from './components/Funnel';
import { RaceTrack } from './components/RaceTrack';
import { FooterTicker } from './components/FooterTicker';
import { ModalNewLead } from './components/ModalNewLead';
import { ModalAttended } from './components/ModalAttended';
import { AlertStrip } from './components/AlertStrip';

export function TvShell() {
  const [data, setData] = useState<TvDashboardData | null>(null);
  const [events, setEvents] = useState<SheetEvent[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [funnelView, setFunnelView] = useState<'GERAL' | 'META'>('GERAL');
  
  const [demoMode, setDemoMode] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/tv');
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

  return (
    <div className="h-screen w-screen bg-[#0B0F14] overflow-hidden font-sans text-slate-200 select-none">
      <AlertStrip count={data.fila} />
      
      <div className={`transition-transform duration-300 ${data.fila > 0 ? 'translate-y-[4vh]' : ''} h-full flex flex-col`}>
        <TopBar periodo="HOJE" lastUpdate={lastUpdate} currentTime={currentTime} />
        <KpiRow kpis={data.kpis} />
        
        <div className="h-[52vh] flex gap-6 px-8 py-2">
          <div className="w-[58%]">
            <Funnel stats={data.funnel} view={funnelView} />
          </div>
          <div className="w-[42%]">
            <RaceTrack karts={data.race} />
          </div>
        </div>

        <div className="mt-auto">
          <FooterTicker campanhaLider={data.campanhaLider} ticker={data.ticker} plantao={data.plantao} />
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
