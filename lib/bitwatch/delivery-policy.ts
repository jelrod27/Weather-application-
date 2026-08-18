import type { NWSAlertDetail } from '@/lib/services/nws-alerts-service'
import { classifySevereAlertTier } from '@/lib/services/severe-alert-classifier'

export type DeliveryPhase = 'new' | 'upgrade' | 'ended' | 'scout'

export type HazardDeliveryPrefs = {
  notifyTornado: boolean
  notifySevereThunderstorm: boolean
  notifyFlashFlood: boolean
  notifyUpgrades: boolean
}

export const DEFAULT_HAZARD_PREFS: HazardDeliveryPrefs = {
  notifyTornado: true,
  notifySevereThunderstorm: true,
  notifyFlashFlood: true,
  notifyUpgrades: true,
}

export const WARNING_ENDED_INSTRUCTION =
  'This National Weather Service warning ended or no longer covers your pin. That is not an all-clear. Stay alert and follow local officials, Wireless Emergency Alerts, and NOAA Weather Radio.'

export function hazardPrefsFrom(
  row?: {
    notifyTornado?: boolean | null
    notifySevereThunderstorm?: boolean | null
    notifyFlashFlood?: boolean | null
    notifyUpgrades?: boolean | null
  } | null,
): HazardDeliveryPrefs {
  return {
    notifyTornado: row?.notifyTornado !== false,
    notifySevereThunderstorm: row?.notifySevereThunderstorm !== false,
    notifyFlashFlood: row?.notifyFlashFlood !== false,
    notifyUpgrades: row?.notifyUpgrades !== false,
  }
}

export function isIbWUpgrade(alert: NWSAlertDetail): boolean {
  const threat = (alert.hazard?.damageThreat ?? '').toLowerCase()
  if (threat === 'considerable' || threat === 'destructive' || threat === 'catastrophic') {
    return true
  }
  return classifySevereAlertTier(alert) === 'critical'
}

export function wantsHazard(event: string, prefs: HazardDeliveryPrefs): boolean {
  const name = event.trim().toLowerCase()
  if (name === 'tornado warning') return prefs.notifyTornado
  if (name === 'severe thunderstorm warning') return prefs.notifySevereThunderstorm
  if (name === 'flash flood warning') return prefs.notifyFlashFlood
  return false
}
