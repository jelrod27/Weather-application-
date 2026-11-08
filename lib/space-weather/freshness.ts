import { swpcTimeTagMs } from '@/lib/space-weather/time-tag'

// Application availability policies, not provider guarantees. Minute-cadence
// observations get 15 minutes; three-hour Kp gets one extra block for delivery;
// NOAA's current scales get one hour. Future observations never establish now.
export const CURRENT_MAX_AGE_MS = {
  xray: 15 * 60_000,
  solarWind: 15 * 60_000,
  kp: 6 * 60 * 60_000,
  scales: 60 * 60_000,
} as const

export function isCurrentObservation(tag: unknown, maximumAge: number, now = Date.now()): boolean {
  const time = swpcTimeTagMs(tag)
  return Number.isFinite(time) && time <= now && time >= now - maximumAge
}
