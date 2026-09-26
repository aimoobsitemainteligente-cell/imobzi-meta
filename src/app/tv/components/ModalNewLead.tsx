import { useEffect, useState } from 'react';

interface ModalNewLeadProps {
  origem: string;
  nome: string;
  createdAt: Date;
}

export function ModalNewLead({ origem, nome, createdAt }: ModalNewLeadProps) {
  const [timer, setTimer] = useState('00:00');

  useEffect(() => {
    const interval = setInterval(() => {
      const diff = Math.max(0, Math.floor((new Date().getTime() - createdAt.getTime()) / 1000));
      const m = Math.floor(diff / 60).toString().padStart(2, '0');
      const s = (diff % 60).toString().padStart(2, '0');
      setTimer(`${m}:${s}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [createdAt]);

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 animate-in fade-in duration-300">
      <div className="bg-slate-900 border-2 border-teal-500 rounded-3xl p-16 flex flex-col items-center shadow-[0_0_100px_rgba(46,230,166,0.2)]">
        <div className="animate-pulse text-teal-400 text-2xl font-black tracking-widest mb-4">NOVO LEAD</div>
        <div className="bg-slate-800 text-slate-300 px-4 py-1 rounded-full text-sm font-bold uppercase tracking-wider mb-8">
          {origem}
        </div>
        <div className="text-7xl font-black text-white mb-12">{nome}</div>
        <div className="text-9xl font-light text-slate-400 font-mono tracking-tighter">
          {timer}
        </div>
      </div>
    </div>
  );
}
