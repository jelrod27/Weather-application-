import type { NWSAlertDetail } from '@/lib/services/nws-alerts-service'

function terminal(alert: NWSAlertDetail): boolean {
  return alert.messageType?.toLowerCase() === 'cancel' || ['CAN', 'EXP', 'UPG'].includes(alert.vtecAction ?? '')
}

/** Resolve the latest event message before checking validity, so a cancellation
 * or expired update can never resurrect an older warning. Unknown validity is
 * an unavailable feed, not evidence that a location is clear. */
export function selectActiveAlerts(alerts: NWSAlertDetail[], nowMs = Date.now()): NWSAlertDetail[] {
  const latest = new Map<string, NWSAlertDetail>()
  for (const alert of alerts) {
    const key = alert.warningEventId || alert.id
    const prior = latest.get(key)
    const sent = Date.parse(alert.sent) || 0
    const priorSent = prior ? Date.parse(prior.sent) || 0 : 0
    if (!prior || sent > priorSent || (sent === priorSent && terminal(alert))) latest.set(key, alert)
  }
  return [...latest.values()].filter((alert) => {
    if (terminal(alert)) return false
    const endTimes = [alert.expires, alert.ends].map(Date.parse).filter(Number.isFinite)
    if (endTimes.length === 0) throw new Error('Alert validity is unavailable')
    const effective = Date.parse(alert.effective)
    return Math.min(...endTimes) > nowMs && (!Number.isFinite(effective) || effective <= nowMs)
  })
}
