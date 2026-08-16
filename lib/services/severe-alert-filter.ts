import type { NWSAlertDetail } from '@/lib/services/nws-alerts-service'

/** Short-fuse NWS warnings that can cause harm. Email and in-app notify only these. */
export const HARM_WARNING_EVENTS = [
  'Tornado Warning',
  'Severe Thunderstorm Warning',
  'Flash Flood Warning',
] as const

const HARM_WARNING_EVENT_SET = new Set<string>(
  HARM_WARNING_EVENTS.map((event) => event.toLowerCase()),
)

export function isSevereMonitorAlert(alert: Pick<NWSAlertDetail, 'event'>): boolean {
  return HARM_WARNING_EVENT_SET.has(alert.event.trim().toLowerCase())
}

export function filterSevereMonitorAlerts(alerts: NWSAlertDetail[]): NWSAlertDetail[] {
  return alerts.filter(isSevereMonitorAlert)
}
