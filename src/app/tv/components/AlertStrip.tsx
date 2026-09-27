export function AlertStrip({ count, coldCount }: { count: number, coldCount?: number }) {
  if (count === 0) return null;
  const hasColdLeads = (coldCount || 0) > 0;
  return (
    <div className={`fixed top-0 left-0 right-0 h-[4vh] ${hasColdLeads ? 'bg-red-600 animate-pulse' : 'bg-amber-500'} text-white font-bold tracking-widest flex items-center justify-center z-40 transition-colors duration-300`}>
      {hasColdLeads ? `⚠️ ATENÇÃO: ${coldCount} LEAD(S) ESFRIANDO NA FILA (>10m) ⚠️` : `${count} ${count === 1 ? 'LEAD' : 'LEADS'} NA FILA`}
    </div>
  );
}
