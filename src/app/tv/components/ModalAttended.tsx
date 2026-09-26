interface ModalAttendedProps {
  corretor: string;
  leadNome: string;
  tempo: string;
}

export function ModalAttended({ corretor, leadNome, tempo }: ModalAttendedProps) {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 animate-in fade-in zoom-in-95 duration-300">
      <div className="bg-teal-900 border-2 border-teal-400 rounded-3xl p-16 flex flex-col items-center shadow-[0_0_100px_rgba(46,230,166,0.4)]">
        <div className="text-teal-300 text-2xl font-black tracking-widest mb-8">ATENDIMENTO RÁPIDO</div>
        <div className="text-5xl font-bold text-white mb-4 text-center">
          <span className="text-teal-400">{corretor}</span> ATENDEU
        </div>
        <div className="text-4xl text-slate-200 mb-8 font-light">
          {leadNome}
        </div>
        <div className="bg-teal-950 text-teal-400 px-6 py-2 rounded-full text-2xl font-mono font-bold border border-teal-800">
          em {tempo}
        </div>
      </div>
    </div>
  );
}
