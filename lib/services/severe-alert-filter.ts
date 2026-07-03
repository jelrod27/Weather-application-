import type { NWSAlertDetail } from '@/lib/services/nws-alerts-service'

/** Same family as /severe — products we monitor for saved locations. */
export const SEVERE_MONITOR_KEYWORDS = [
  'tornado',
  'thunderstorm',
  'wind',
  'hail',
  'flood',
  'hurricane',
  'typhoon',
  'blizzard',
  'ice storm',
  'winter storm',
] as const

export function isSevereMonitorAlert(alert: Pick<NWSAlertDetail, 'event'>): boolean {
  const event = alert.event.toLowerCase()
  return SEVERE_MONITOR_KEYWORDS.some((kw) => event.includes(kw))
}

export function filterSevereMonitorAlerts(alerts: NWSAlertDetail[]): NWSAlertDetail[] {
  return alerts.filter(isSevereMonitorAlert)
}
