import type { SupabaseClient } from '@supabase/supabase-js'
import {
  SCOUT_INSTRUCTION,
  WARNING_ENDED_INSTRUCTION,
  type DeliveryPhase,
} from '@/lib/bitwatch/delivery-policy'
import { loadCanonicalAlertBySlug } from '@/lib/bitwatch/ingest'
import { eventKey, matchProtectedPlace } from '@/lib/bitwatch/match'
import { claimDelivery, markDeliveryAccepted } from '@/lib/bitwatch/outbox'
import { getHubAlertsHref } from '@/lib/home/hub-links'
import type { Database, Json } from '@/lib/supabase/types'
import type { NWSAlertDetail } from '@/lib/services/nws-alerts-service'
import { classifySevereAlertTier } from '@/lib/services/severe-alert-classifier'
import type { SevereWeatherAlertPayload } from '@/lib/services/severe-alert-types'

const CHANNELS = ['in_app', 'email', 'push'] as const

export function pointKey(lat: number, lon: number): string {
  return `${lat.toFixed(4)},${lon.toFixed(4)}`
}

function inboxAlertId(key: string, phase: DeliveryPhase): string {
  return phase === 'new' ? key : `${key}#${phase}`
}

export function buildWarningPayload(
  locationName: string,
  savedLocationId: string,
  alert: NWSAlertDetail,
  phase: DeliveryPhase,
  manageHref?: string,
  scout?: { minutesAhead: number; nowcastWet: boolean },
): SevereWeatherAlertPayload {
  const key = eventKey(alert)
  if (phase === 'scout' && scout) {
    const rain = scout.nowcastWet
      ? ' Nowcast rain is also increasing at the pin.'
      : ''
    return {
      alertId: inboxAlertId(key, 'scout'),
      event: 'Bitwatch Scout',
      headline: `Unofficial: a ${alert.event} cell may approach ${locationName} in about ${scout.minutesAhead} minutes.${rain}`,
      instruction: SCOUT_INSTRUCTION,
      severity: alert.severity,
      urgency: alert.urgency,
      expires: alert.expires,
      areaDesc: alert.areaDesc,
      locationName,
      savedLocationId,
      warningsHref: getHubAlertsHref(alert.id),
      tier: 'high',
      warningEventId: key,
      phase: 'scout',
      manageHref,
    }
  }
  const tier = phase === 'ended' ? 'high' : classifySevereAlertTier(alert)
  return {
    alertId: inboxAlertId(key, phase),
    event: alert.event,
    headline:
      phase === 'ended'
        ? `A National Weather Service ${alert.event} ended or no longer covers ${locationName}.`
        : alert.headline,
    instruction: phase === 'ended' ? WARNING_ENDED_INSTRUCTION : alert.instruction,
    severity: alert.severity,
    urgency: alert.urgency,
    expires: alert.expires,
    areaDesc: alert.areaDesc,
    locationName,
    savedLocationId,
    warningsHref: getHubAlertsHref(alert.id),
    tier,
    warningEventId: key,
    phase,
    manageHref,
  }
}

function endedStub(eventId: string): NWSAlertDetail {
  return {
    id: eventId,
    event: 'Warning ended',
    headline: 'A National Weather Service warning ended or no longer covers this pin.',
    severity: 'Severe',
    urgency: 'Immediate',
    expires: new Date().toISOString(),
    areaDesc: '',
    sent: new Date().toISOString(),
    effective: new Date().toISOString(),
    ends: new Date().toISOString(),
    description: '',
    instruction: WARNING_ENDED_INSTRUCTION,
    certainty: 'Unknown',
    response: 'None',
    sender: 'NWS',
    geometry: null,
    hazard: { maxHail: null, maxWind: null, source: null, damageThreat: null },
    messageType: 'Cancel',
    warningEventId: eventId,
    vtecAction: 'CAN',
    vtecRaw: [],
    ugc: [],
    affectedZones: [],
    motion: null,
  }
}

export async function claimPhaseChannels(
  supabase: SupabaseClient<Database>,
  input: {
    warningEventId: string
    phase: DeliveryPhase
    subscriberKind: 'account' | 'guest'
    subscriberId: string
    protectedPlaceKey: string
    payload: SevereWeatherAlertPayload
    method: string
  },
): Promise<'claimed' | 'duplicate' | 'unavailable'> {
  const payload = {
    ...input.payload,
    matchMethod: input.method,
  } as unknown as Json

  try {
    const inApp = await claimDelivery(supabase, {
      warningEventId: input.warningEventId,
      lifecyclePhase: input.phase,
      channel: 'in_app',
      subscriberKind: input.subscriberKind,
      subscriberId: input.subscriberId,
      protectedPlaceKey: input.protectedPlaceKey,
      payload,
    })
    if (inApp === null) return 'duplicate'
    await markDeliveryAccepted(supabase, inApp)
    for (const channel of CHANNELS) {
      if (channel === 'in_app') continue
      const claimedId = await claimDelivery(supabase, {
        warningEventId: input.warningEventId,
        lifecyclePhase: input.phase,
        channel,
        subscriberKind: input.subscriberKind,
        subscriberId: input.subscriberId,
        protectedPlaceKey: input.protectedPlaceKey,
        payload,
      })
      if (claimedId) await markDeliveryAccepted(supabase, claimedId)
    }
    return 'claimed'
  } catch (error) {
    console.error('[bitwatch-outbox] claim failed', error)
    return 'unavailable'
  }
}

export async function resolveEndedAlert(
  supabase: SupabaseClient<Database>,
  eventId: string,
  nationalAlerts: NWSAlertDetail[],
): Promise<NWSAlertDetail> {
  const fromNational = nationalAlerts.find((alert) => eventKey(alert) === eventId || alert.id === eventId)
  if (fromNational) return fromNational
  try {
    const stored = await loadCanonicalAlertBySlug(supabase, eventId)
    if (stored) return stored
  } catch (error) {
    console.error('[bitwatch-monitor] ended lookup failed', error)
  }
  return endedStub(eventId)
}

export function alreadyTracked(previousSet: Set<string>, alert: NWSAlertDetail): boolean {
  return previousSet.has(eventKey(alert)) || previousSet.has(alert.id)
}

export function coveringKeys(alerts: NWSAlertDetail[]): Set<string> {
  const keys = new Set<string>()
  for (const alert of alerts) {
    keys.add(eventKey(alert))
    keys.add(alert.id)
  }
  return keys
}

export function stillCoveredByCurrent(
  lat: number,
  lon: number,
  resolved: NWSAlertDetail,
  currentAlerts: NWSAlertDetail[],
  pointActiveKeys: Set<string> | undefined,
): boolean {
  return (
    matchProtectedPlace(lat, lon, resolved, pointActiveKeys).covered &&
    currentAlerts.some((alert) => eventKey(alert) === eventKey(resolved))
  )
}

export function rememberEndedKeys(endedSeen: Set<string>, resolved: NWSAlertDetail, prevId: string): boolean {
  const endedKey = eventKey(resolved)
  if (endedSeen.has(endedKey) || endedSeen.has(resolved.id) || endedSeen.has(prevId)) {
    return true
  }
  endedSeen.add(endedKey)
  endedSeen.add(resolved.id)
  endedSeen.add(prevId)
  return false
}

export function trackingIds(alerts: NWSAlertDetail[]): string[] {
  return [...coveringKeys(alerts)]
}
