import type { NWSAlertDetail } from '@/lib/services/nws-alerts-service'

/**
 * Desk priority 0–10 (one decimal), labeled as a local ranking aid — not NWS.
 */
export function warningDeskScore(
  alert: Pick<NWSAlertDetail, 'event' | 'headline' | 'description' | 'severity' | 'hazard'>,
): number {
  const event = alert.event.trim().toLowerCase()
  const text = `${alert.headline} ${alert.description ?? ''}`.toLowerCase()
  let score = 2

  if (event.includes('tornado') && event.includes('warning')) score = 8.8
  else if (event.includes('flash flood') && event.includes('warning')) score = 6.2
  else if (event.includes('thunderstorm') && event.includes('warning')) score = 6.8
  else if (event.includes('warning')) score = 5.0

  if (text.includes('tornado emergency') || text.includes('particularly dangerous situation')) {
    score = 10
  } else if (text.includes('flash flood emergency')) {
    score = Math.max(score, 9.2)
  }

  const threat = (alert.hazard?.damageThreat ?? '').toLowerCase()
  if (threat === 'destructive' || threat === 'catastrophic') score = Math.max(score, 8.5)
  if (threat === 'considerable') score = Math.max(score, 7.6)
  if (alert.severity === 'Extreme') score = Math.min(10, score + 0.3)

  return Math.round(score * 10) / 10
}
