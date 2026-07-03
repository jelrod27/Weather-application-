import type { NWSAlertDetail } from '@/lib/services/nws-alerts-service'

export type SevereAlertKind = 'severe_weather' | 'severe_weather_all_clear'

export type SevereAlertTier = 'critical' | 'high' | 'standard'

export type SevereWeatherAlertPayload = {
  alertId: string
  event: string
  headline: string
  severity: string
  urgency: string
  expires: string
  areaDesc: string
  locationName: string
  savedLocationId: string
  warningsHref: string
  tier?: SevereAlertTier
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
}

export type MonitorNewAlert = {
  subscription: MonitorSubscription
  alert: NWSAlertDetail
  userAlertId: string
  payload: SevereWeatherAlertPayload
}

export type MonitorClearedLocation = {
  subscription: MonitorSubscription
  clearedAlertIds: string[]
}

export type SevereMonitorRunResult = {
  subscriptionsChecked: number
  uniquePoints: number
  newAlerts: number
  allClears: number
  errors: string[]
}
