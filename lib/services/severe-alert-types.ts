import type { HazardDeliveryPrefs } from '@/lib/bitwatch/delivery-policy'
import type { NWSAlertDetail } from '@/lib/services/nws-alerts-service'
import type { GuestAlertSubscriber } from '@/lib/services/guest-alert-subscribers'

export type SevereAlertTier = 'critical' | 'high' | 'standard'

export type SevereWeatherAlertPayload = {
  alertId: string
  event: string
  headline: string
  instruction?: string
  severity: string
  urgency: string
  expires: string
  areaDesc: string
  locationName: string
  savedLocationId: string
  warningsHref: string
  tier?: SevereAlertTier
  warningEventId?: string
  phase?: 'new' | 'upgrade' | 'ended' | 'scout'
  manageHref?: string
}

export type SevereWeatherAllClearPayload = {
  locationName: string
  savedLocationId: string
  clearedAlertIds: string[]
  warningsHref: string
}

export type MonitorSubscription = {
  id: string
  user_id: string
  saved_location_id: string
  latitude: number
  longitude: number
  locationLabel: string
} & HazardDeliveryPrefs

export type MonitorNewAlert = {
  subscription: MonitorSubscription
  alert: NWSAlertDetail
  userAlertId: string
  payload: SevereWeatherAlertPayload
}

export type MonitorNewGuestAlert = {
  subscriber: GuestAlertSubscriber
  alert: NWSAlertDetail
  deliveryId: string
  payload: SevereWeatherAlertPayload
}

export type SevereMonitorRunResult = {
  subscriptionsChecked: number
  guestSubscribersChecked: number
  uniquePoints: number
  newAlerts: number
  guestNewAlerts: number
  endedAlerts: number
  guestEndedAlerts: number
  scoutAlerts: number
  allClears: number
  errors: string[]
}
