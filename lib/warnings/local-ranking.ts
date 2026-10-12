import { pointConfirmationKeys } from '@/lib/warnings/active-alerts'
import { extractAreaStates } from '@/lib/bitwatch/coverage'
import { matchProtectedPlace } from '@/lib/bitwatch/match'
import { distanceKmToNwsGeometry, pointInNwsGeometry } from '@/lib/services/nws-alert-geometry'
import { compareWarningImportance } from './priority'
import type { NWSAlertDetail } from '@/lib/services/nws-alerts-service'

/** Storm cells near a city centroid, not covering it. About 50 miles. */
export const NEARBY_WARNING_KM = 80

export function compareWarningPriority(a: NWSAlertDetail, b: NWSAlertDetail): number {
  const importance = compareWarningImportance(a, b)
  if (importance !== 0) return importance
  return new Date(a.expires).getTime() - new Date(b.expires).getTime()
}

export function isLocalWarning(
  alert: Pick<NWSAlertDetail, 'geometry'>,
  pin: { lat: number; lon: number } | null | undefined,
): boolean {
  if (!pin) return false
  return pointInNwsGeometry(pin.lat, pin.lon, alert.geometry)
}

export function isNearbyWarning(
  alert: Pick<NWSAlertDetail, 'geometry'>,
  pin: { lat: number; lon: number } | null | undefined,
  nearbyKm: number = NEARBY_WARNING_KM,
): boolean {
  if (!pin || isLocalWarning(alert, pin)) return false
  const km = distanceKmToNwsGeometry(pin.lat, pin.lon, alert.geometry)
  return km != null && km <= nearbyKm
}

export function splitLocalWarnings(
  alerts: NWSAlertDetail[],
  pin: { lat: number; lon: number } | null | undefined,
  pointActiveKeys?: Set<string>,
): { onYou: NWSAlertDetail[]; nearby: NWSAlertDetail[]; elsewhere: NWSAlertDetail[] } {
  const onYou: NWSAlertDetail[] = []
  const nearby: NWSAlertDetail[] = []
  const elsewhere: NWSAlertDetail[] = []
  const nearbyDistance = new Map<string, number>()

  for (const alert of alerts) {
    // Do not pass event-wide aliases to the shared delivery matcher: the desk
    // can contain multiple independent geographic segments of the same event.
    const confirmed = pointActiveKeys && pointConfirmationKeys(alert).some((key) => pointActiveKeys.has(key))
    const matchKeys = confirmed ? new Set([alert.id]) : undefined
    if (pin && matchProtectedPlace(pin.lat, pin.lon, alert, matchKeys).covered) {
      onYou.push(alert)
      continue
    }
    if (pin) {
      const km = distanceKmToNwsGeometry(pin.lat, pin.lon, alert.geometry)
      if (km != null && km <= NEARBY_WARNING_KM) {
        nearby.push(alert)
        nearbyDistance.set(alert.id, km)
        continue
      }
    }
    elsewhere.push(alert)
  }

  onYou.sort(compareWarningPriority)
  nearby.sort((a, b) => {
    const rank = compareWarningPriority(a, b)
    if (rank !== 0) return rank
    return (nearbyDistance.get(a.id) ?? Infinity) - (nearbyDistance.get(b.id) ?? Infinity)
  })
  elsewhere.sort(compareWarningPriority)
  return { onYou, nearby, elsewhere }
}

export function filterAlertsByQuery(alerts: NWSAlertDetail[], query: string): NWSAlertDetail[] {
  const q = query.trim().toLowerCase()
  if (!q) return alerts
  return alerts.filter(
    (a) =>
      a.event.toLowerCase().includes(q) ||
      a.areaDesc.toLowerCase().includes(q) ||
      a.headline.toLowerCase().includes(q) ||
      a.warningEventId?.toLowerCase().includes(q) ||
      a.ugc?.some((code) => code.toLowerCase().includes(q)),
  )
}

export type DeskEventFilter = 'all' | 'Tornado Warning' | 'Severe Thunderstorm Warning' | 'Flash Flood Warning' | 'other'

export function filterDeskAlerts(
  alerts: NWSAlertDetail[],
  input: { query: string; event: DeskEventFilter; state: string },
): NWSAlertDetail[] {
  const harm = new Set(['Tornado Warning', 'Severe Thunderstorm Warning', 'Flash Flood Warning'])
  return filterAlertsByQuery(alerts, input.query).filter((alert) => {
    if (input.event === 'other') {
      if (harm.has(alert.event)) return false
    } else if (input.event !== 'all' && alert.event !== input.event) {
      return false
    }
    if (input.state && !extractStatesFromAlert(alert).includes(input.state)) return false
    return true
  })
}

function extractStatesFromAlert(alert: NWSAlertDetail): string[] {
  const fromUgc = (alert.ugc ?? [])
    .map((code) => code.slice(0, 2).toUpperCase())
    .filter((code) => /^[A-Z]{2}$/.test(code))
  return [...new Set([...extractAreaStates(alert.areaDesc), ...fromUgc])]
}

export function uniqueAlertStates(alerts: NWSAlertDetail[]): string[] {
  return [...new Set(alerts.flatMap(extractStatesFromAlert))].sort()
}
