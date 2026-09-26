import type { NWSAlertDetail } from '@/lib/services/nws-alerts-service'

function terminal(alert: NWSAlertDetail): boolean {
  return alert.messageType?.trim().toLowerCase() === 'cancel' || ['CAN', 'EXP', 'UPG'].includes(alert.vtecAction ?? '')
}

function segmentKeys(alert: NWSAlertDetail): string[] {
  const event = alert.warningEventId || alert.id
  const ugc = (alert.ugc ?? []).map((code) => code.trim().toUpperCase()).filter(Boolean)
  const areas = ugc.length ? ugc : (alert.affectedZones ?? []).map((zone) => zone.trim().toUpperCase()).filter(Boolean)
  // Legacy records without geographic identifiers can only resolve at event level.
  return areas.length ? [...new Set(areas)].map((area) => `${event}:${area}`) : [event]
}

/** UI point confirmation may span CAP revisions, but never independent segments. */
export function pointConfirmationKeys(alert: NWSAlertDetail): string[] {
  const segments = segmentKeys(alert).sort()
  const event = alert.warningEventId || alert.id
  return segments.length === 1 && segments[0] === event
    ? [alert.id]
    : [alert.id, `segment:${JSON.stringify(segments)}`]
}

/** Resolve source revisions per geographic segment before checking validity.
 * A cancellation in one county must not remove the event in another county.
 * Unknown validity or a partially superseded polygon is unavailable, never clear. */
export function selectActiveAlerts(alerts: NWSAlertDetail[], nowMs = Date.now()): NWSAlertDetail[] {
  const latest = new Map<string, NWSAlertDetail>()
  for (const alert of alerts) {
    // Missing legacy timestamps are allowed; malformed source times are not.
    // Validate even terminal revisions before they can lose to an older alert.
    for (const timestamp of [alert.sent, alert.effective]) {
      if (timestamp?.trim() && !Number.isFinite(Date.parse(timestamp))) {
        throw new Error('Alert validity is unavailable')
      }
    }
    for (const key of segmentKeys(alert)) {
      const prior = latest.get(key)
      const sent = Date.parse(alert.sent) || 0
      const priorSent = prior ? Date.parse(prior.sent) || 0 : 0
      if (!prior || sent > priorSent || (sent === priorSent && terminal(alert))) latest.set(key, alert)
    }
  }
  return [...new Set(latest.values())].filter((alert) => {
    if (terminal(alert)) return false
    const endTimes = [alert.expires, alert.ends].map(Date.parse).filter(Number.isFinite)
    if (endTimes.length === 0) throw new Error('Alert validity is unavailable')
    const effective = Date.parse(alert.effective)
    if (Math.min(...endTimes) <= nowMs || (Number.isFinite(effective) && effective > nowMs)) return false
    if (segmentKeys(alert).some((key) => latest.get(key) !== alert)) {
      // The old polygon spans both retained and superseded areas. Without an
      // authoritative replacement boundary, neither that polygon nor a clear
      // location status is safe to publish. Let consumers show unavailable.
      throw new Error('Updated alert coverage is unavailable')
    }
    return true
  })
}
