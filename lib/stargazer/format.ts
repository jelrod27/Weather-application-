/** Display astronomy instants in the viewed location, with UTC for legacy payloads. */
function formatInstant(date: Date | string | null, timeZone: string, options: Intl.DateTimeFormatOptions): string {
  if (!date || !Number.isFinite(new Date(date).getTime())) return '';
  try {
    return new Intl.DateTimeFormat('en-US', { ...options, timeZone }).format(new Date(date));
  } catch {
    return new Intl.DateTimeFormat('en-US', { ...options, timeZone: 'UTC' }).format(new Date(date));
  }
}

export function formatTime(date: Date | string | null, timeZone = 'UTC', hour12 = false): string {
  return formatInstant(date, timeZone, {
    hour: hour12 ? 'numeric' : '2-digit', minute: '2-digit', timeZoneName: 'shortOffset',
    ...(hour12 ? { hour12: true } : { hourCycle: 'h23' }),
  }) || '--:--';
}

export function formatDate(date: Date | string, timeZone = 'UTC', includeYear = false): string {
  return formatInstant(date, timeZone, {
    month: 'short', day: 'numeric', ...(includeYear ? { year: 'numeric' } : {}),
  }) || 'Unavailable';
}

/** Keep approximate annual events on their calendar day, including today. */
export function nextCalendarDate(month: number, day: number, timeZone = 'UTC', now = new Date()): string {
  let today: string;
  try {
    today = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  } catch {
    today = now.toISOString().slice(0, 10);
  }
  const suffix = `-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const year = Number(today.slice(0, 4));
  const candidate = `${year}${suffix}`;
  return candidate < today ? `${year + 1}${suffix}` : candidate;
}
