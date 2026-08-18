import { pointInNwsGeometry } from '@/lib/services/nws-alert-geometry'
import type { NWSAlertDetail } from '@/lib/services/nws-alerts-service'

export type PlaceMatchMethod = 'polygon' | 'point-active' | 'unresolved'

export type PlaceMatch = {
  covered: boolean
  method: PlaceMatchMethod
}

export function matchProtectedPlace(
  lat: number,
  lon: number,
  alert: Pick<NWSAlertDetail, 'id' | 'warningEventId' | 'geometry'>,
  pointActiveKeys?: Set<string>,
): PlaceMatch {
  if (pointInNwsGeometry(lat, lon, alert.geometry)) {
    return { covered: true, method: 'polygon' }
  }
  if (alert.geometry) {
    return { covered: false, method: 'polygon' }
  }
  if (
    pointActiveKeys &&
    (pointActiveKeys.has(alert.id) ||
      (alert.warningEventId ? pointActiveKeys.has(alert.warningEventId) : false))
  ) {
    return { covered: true, method: 'point-active' }
  }
  return { covered: false, method: 'unresolved' }
}

export function coveringAlerts<T extends Pick<NWSAlertDetail, 'id' | 'warningEventId' | 'geometry'>>(
  lat: number,
  lon: number,
  alerts: T[],
  pointActiveKeys?: Set<string>,
): T[] {
  return alerts.filter((alert) => matchProtectedPlace(lat, lon, alert, pointActiveKeys).covered)
}

export function eventKey(alert: Pick<NWSAlertDetail, 'id' | 'warningEventId'>): string {
  return alert.warningEventId || alert.id
}
