import { projectMotion, type StormMotion } from '@/lib/bitwatch/motion'
import { matchProtectedPlace } from '@/lib/bitwatch/match'
import type { NWSAlertDetail } from '@/lib/services/nws-alerts-service'
import { isSevereMonitorAlert } from '@/lib/services/severe-alert-filter'

const EARTH_RADIUS_KM = 6371
const APPROACH_RADIUS_KM = 25
const LOOKAHEAD_MINUTES = [15, 30, 45] as const

export type ScoutHit = {
  source: NWSAlertDetail
  minutesAhead: number
  distanceKm: number
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180
}

export function haversineKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const dLat = toRad(b.lat - a.lat)
  const dLon = toRad(b.lon - a.lon)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)))
}

function motionOf(alert: NWSAlertDetail): StormMotion | null {
  return alert.motion
}

/**
 * Unofficial approaching-storm signal. Never fires when a harm Warning Event
 * already covers the pin. Uses TIME...MOT...LOC projection only.
 */
export function scoutApproachingPlace(
  lat: number,
  lon: number,
  alerts: NWSAlertDetail[],
  radiusKm = APPROACH_RADIUS_KM,
): ScoutHit | null {
  const pin = { lat, lon }
  let best: ScoutHit | null = null

  for (const alert of alerts) {
    if (!isSevereMonitorAlert(alert)) continue
    if (matchProtectedPlace(lat, lon, alert).covered) continue
    const motion = motionOf(alert)
    if (!motion) continue

    const currentKm = haversineKm(pin, { lat: motion.lat, lon: motion.lon })
    for (const minutesAhead of LOOKAHEAD_MINUTES) {
      const projected = projectMotion(motion, minutesAhead)
      const projectedKm = haversineKm(pin, projected)
      if (projectedKm > radiusKm) continue
      if (projectedKm >= currentKm - 1) continue
      if (!best || minutesAhead < best.minutesAhead || projectedKm < best.distanceKm) {
        best = { source: alert, minutesAhead, distanceKm: projectedKm }
      }
    }
  }

  return best
}
