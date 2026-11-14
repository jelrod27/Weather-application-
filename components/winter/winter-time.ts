/** Always name the time zone; missing source times stay unknown. */
export function winterTime(value: string | null, timeZone = 'UTC', precise = false): string {
  if (!value || !Number.isFinite(Date.parse(value))) return 'Unknown'
  try {
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: precise ? 'numeric' : undefined, second: precise ? '2-digit' : undefined, hour: 'numeric', minute: '2-digit', timeZone, timeZoneName: 'short' }).format(new Date(value))
  } catch {
    return winterTime(value, 'UTC', precise)
  }
}

export function winterInterval(start: string | null, end: string | null, timeZone = 'UTC'): string {
  return `${winterTime(start, timeZone)} – ${winterTime(end, timeZone)}`
}
