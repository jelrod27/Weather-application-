import type { NWSAlertDetail } from '@/lib/services/nws-alerts-service'
import type { SevereAlertTier } from '@/lib/services/severe-alert-types'

function haystack(alert: NWSAlertDetail): string {
  return [alert.event, alert.headline, alert.description, alert.instruction]
    .join(' ')
    .toLowerCase()
}

function includesAny(text: string, phrases: string[]): boolean {
  return phrases.some((p) => text.includes(p))
}

/**
 * Tier NWS products for delivery priority (Y'all Call-style escalation).
 * - critical: life-threatening / PDS / emergency wording
 * - high: active warnings (tornado, severe tstm, flash flood)
 * - standard: watches and other monitored severe-family products
 */
export function classifySevereAlertTier(alert: NWSAlertDetail): SevereAlertTier {
  const text = haystack(alert)

  if (
    includesAny(text, [
      'tornado emergency',
      'flash flood emergency',
      'particularly dangerous situation',
      'pds ',
      ' pds',
      'confirmed tornado',
      'tornado observed',
      'tornado reported',
    ])
  ) {
    return 'critical'
  }

  const event = alert.event.toLowerCase()

  if (
    event.includes('warning') &&
    includesAny(event, ['tornado', 'thunderstorm', 'flash flood', 'hurricane', 'typhoon'])
  ) {
    return 'high'
  }

  if (event.includes('warning')) {
    return 'high'
  }

  return 'standard'
}

export function shouldEmailSevereAlertTier(tier: SevereAlertTier): boolean {
  return tier === 'critical' || tier === 'high'
}

export function severeAlertTierLabel(tier: SevereAlertTier): string {
  switch (tier) {
    case 'critical':
      return 'CRITICAL'
    case 'high':
      return 'HIGH'
    default:
      return 'ADVISORY'
  }
}
