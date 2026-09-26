export function AlertStrip({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <div className="fixed top-0 left-0 right-0 h-[4vh] bg-red-600 text-white font-bold tracking-widest flex items-center justify-center z-40 animate-pulse">
      {count} {count === 1 ? 'LEAD' : 'LEADS'} SEM DONO NA FILA
    </div>
  );
}
