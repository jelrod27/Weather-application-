/**
 * Format instants in a weather location's IANA timezone.
 * Matches weather.com / AccuWeather: show the place's local clock, not the viewer's.
 */

export function formatLocationTime(
  date: Date | number | string,
  timeZone?: string | null,
  options: Intl.DateTimeFormatOptions = {
    hour: 'numeric',
    minute: '2-digit',
  },
): string {
  const d = typeof date === 'object' && date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '';

  try {
    return d.toLocaleTimeString('en-US', {
      ...options,
      ...(timeZone ? { timeZone } : {}),
    });
  } catch {
    // Invalid IANA zone — fall back to viewer-local formatting.
    return d.toLocaleTimeString('en-US', options);
  }
}

export function formatLocationTimeWithZone(
  date: Date | number | string,
  timeZone?: string | null,
): string {
  return formatLocationTime(date, timeZone, {
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: timeZone ? 'short' : undefined,
  });
}
