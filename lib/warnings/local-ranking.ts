import { pointInNwsGeometry } from '@/lib/services/nws-alert-geometry'
import type { NWSAlertDetail } from '@/lib/services/nws-alerts-service'

const SEVERITY_ORDER: Record<string, number> = {
  Extreme: 0,
  Severe: 1,
  Moderate: 2,
  Minor: 3,
}

const URGENCY_ORDER: Record<string, number> = {
  Immediate: 0,
  Expected: 1,
  Future: 2,
}

function eventRank(event: string): number {
  const e = event.trim().toLowerCase()
  if (e === 'tornado warning') return 0
  if (e === 'flash flood warning') return 1
  if (e === 'severe thunderstorm warning') return 2
  return 3
}

export function compareWarningPriority(a: NWSAlertDetail, b: NWSAlertDetail): number {
  const ev = eventRank(a.event) - eventRank(b.event)
  if (ev !== 0) return ev
  const su = (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9)
  if (su !== 0) return su
  const uu = (URGENCY_ORDER[a.urgency] ?? 9) - (URGENCY_ORDER[b.urgency] ?? 9)
  if (uu !== 0) return uu
  return new Date(a.expires).getTime() - new Date(b.expires).getTime()
}

export function isLocalWarning(
  alert: Pick<NWSAlertDetail, 'geometry'>,
  pin: { lat: number; lon: number } | null | undefined,
): boolean {
  if (!pin) return false
  return pointInNwsGeometry(pin.lat, pin.lon, alert.geometry)
}

export function splitLocalWarnings(
  alerts: NWSAlertDetail[],
  pin: { lat: number; lon: number } | null | undefined,
): { onYou: NWSAlertDetail[]; elsewhere: NWSAlertDetail[] } {
  const onYou: NWSAlertDetail[] = []
  const elsewhere: NWSAlertDetail[] = []
  for (const alert of alerts) {
    if (isLocalWarning(alert, pin)) onYou.push(alert)
    else elsewhere.push(alert)
  }
  onYou.sort(compareWarningPriority)
  elsewhere.sort(compareWarningPriority)
  return { onYou, elsewhere }
}

export function filterAlertsByQuery(alerts: NWSAlertDetail[], query: string): NWSAlertDetail[] {
  const q = query.trim().toLowerCase()
  if (!q) return alerts
  return alerts.filter(
    (a) =>
      a.event.toLowerCase().includes(q) ||
      a.areaDesc.toLowerCase().includes(q) ||
      a.headline.toLowerCase().includes(q),
  )
}
