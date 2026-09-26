/**
 * Utilitários unificados de fuso horário e data para o painel e webhook.
 * O Vercel roda em UTC, mas todos os eventos de lead e exibição do painel
 * devem ser baseados no fuso horário 'America/Sao_Paulo'.
 */

const TIMEZONE = 'America/Sao_Paulo';

/**
 * Formata um timestamp, Data ou string ISO para as colunas de data e hora do Google Sheets
 * no fuso horário de São Paulo.
 * @param date Referência de data (Date, número de ms, ou string ISO). Se vazio, usa agora.
 * @returns { data: 'DD/MM/YYYY', hora: 'HH:mm' }
 */
export function formatToSP(date?: string | Date | number | null): { data: string; hora: string } {
  const d = date ? new Date(date) : new Date();
  
  if (isNaN(d.getTime())) {
    return { data: '', hora: '' };
  }

  // Utiliza a API de internacionalização que é segura no Vercel Node runtime
  const formatter = new Intl.DateTimeFormat('pt-BR', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  // O formato retornado geralmente é "DD/MM/YYYY, HH:mm"
  const formatted = formatter.format(d);
  const [dataPart, horaPart] = formatted.split(', ');

  return {
    data: dataPart || '',
    hora: horaPart ? horaPart.replace(':', ':') : '', // Garantir o trim/limpeza se necessário
  };
}

/**
 * Faz o parse de strings do Google Sheets (ex: Data "26/09/2026", Hora "14:30")
 * e retorna o timestamp absoluto (em ms) representando esse momento em São Paulo.
 * Se a string for inválida ou vazia, retorna null (evitando leads no "Hoje" erroneamente).
 */
export function parseFromSP(dataStr: string, horaStr?: string): number | null {
  if (!dataStr || typeof dataStr !== 'string') return null;

  const dateParts = dataStr.trim().split('/');
  if (dateParts.length !== 3) return null;

  const [dia, mes, ano] = dateParts;
  if (!dia || !mes || !ano || ano.length < 4) return null;

  let hh = '00';
  let mm = '00';

  if (horaStr && typeof horaStr === 'string') {
    const timeParts = horaStr.trim().split(':');
    if (timeParts.length >= 2) {
      hh = timeParts[0].padStart(2, '0');
      mm = timeParts[1].padStart(2, '0');
    }
  }

  // Montamos a string ISO forçando o offset de -03:00 (Brasília padrão).
  // Nota: Isso não trata mudanças dinâmicas de horário de verão, mas para 
  // histórico recente e atual é seguro e mais robusto que `new Date(ano, mes, dia)`.
  const isoString = `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}T${hh}:${mm}:00-03:00`;
  const ms = new Date(isoString).getTime();

  return isNaN(ms) ? null : ms;
}

/**
 * Retorna o timestamp (ms) do INÍCIO do período solicitado, 
 * considerando a meia-noite no fuso horário de São Paulo.
 */
export function getStartOfPeriodSP(period: 'hoje' | 'semana' | 'mes'): number {
  const now = new Date();
  
  // Pegamos a data atual em SP
  const { data } = formatToSP(now);
  const [diaStr, mesStr, anoStr] = data.split('/');
  
  const ano = parseInt(anoStr, 10);
  const mes = parseInt(mesStr, 10);
  const dia = parseInt(diaStr, 10);

  if (period === 'hoje') {
    return parseFromSP(`${diaStr}/${mesStr}/${anoStr}`) || 0;
  }

  if (period === 'mes') {
    return parseFromSP(`01/${mesStr}/${anoStr}`) || 0;
  }

  if (period === 'semana') {
    // Para semana, precisamos saber o dia da semana atual em SP
    // Como parseFromSP te dá o timestamp de SP, podemos usar um truque:
    const hojeMs = parseFromSP(`${diaStr}/${mesStr}/${anoStr}`) || 0;
    const hojeDate = new Date(hojeMs);
    // getDay() em UTC numa data fixada em -03:00 às 00:00 local vai ser 03:00 UTC.
    // Então o .getDay() vai dar o dia da semana correto para aquele dia.
    let dayOfWeek = hojeDate.getDay(); 
    // Se domingo = 0, segunda = 1. Vamos considerar a semana começando na Segunda (1) ou Domingo (0)?
    // Pelo aggregates original: startOfWeek.setDate(now.getDate() - now.getDay()); (começa domingo)
    
    // Subtrai os dias em milissegundos
    const startOfWeekMs = hojeMs - (dayOfWeek * 24 * 60 * 60 * 1000);
    return startOfWeekMs;
  }

  return 0;
}
