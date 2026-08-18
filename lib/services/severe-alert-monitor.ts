import type { SupabaseClient } from '@supabase/supabase-js'
import {
  SCOUT_INSTRUCTION,
  WARNING_ENDED_INSTRUCTION,
  hazardPrefsFrom,
  isIbWUpgrade,
  wantsHazard,
  type DeliveryPhase,
  type HazardDeliveryPrefs,
} from '@/lib/bitwatch/delivery-policy'
import { loadCanonicalActiveAlerts, loadCanonicalAlertBySlug } from '@/lib/bitwatch/ingest'
import { coveringAlerts, eventKey, matchProtectedPlace } from '@/lib/bitwatch/match'
import { claimDelivery } from '@/lib/bitwatch/outbox'
import { scoutApproachingPlace } from '@/lib/bitwatch/scout'
import { pinNowcastIsWet } from '@/lib/bitwatch/scout-nowcast'
import { guestManagePath } from '@/lib/alerts/guest-tokens'
import { getHubAlertsHref } from '@/lib/home/hub-links'
import type { Database, Json } from '@/lib/supabase/types'
import {
  fetchActiveAlertsDetail,
  fetchHarmWarningAlerts,
  type NWSAlertDetail,
} from '@/lib/services/nws-alerts-service'
import { filterSevereMonitorAlerts } from '@/lib/services/severe-alert-filter'
import { classifySevereAlertTier } from '@/lib/services/severe-alert-classifier'
import { fetchEnabledSevereSubscriptions } from '@/lib/services/severe-alert-subscriptions'
import { fetchEnabledGuestSubscribers } from '@/lib/services/guest-alert-subscribers'
import type { GuestAlertSubscriber } from '@/lib/services/guest-alert-subscribers'
import type {
  MonitorNewAlert,
  MonitorNewGuestAlert,
  MonitorSubscription,
  SevereMonitorRunResult,
  SevereWeatherAlertPayload,
} from '@/lib/services/severe-alert-types'

const CHANNELS = ['in_app', 'email', 'push'] as const

function pointKey(lat: number, lon: number): string {
  return `${lat.toFixed(4)},${lon.toFixed(4)}`
}

function inboxAlertId(key: string, phase: DeliveryPhase): string {
  return phase === 'new' ? key : `${key}#${phase}`
}

function buildWarningPayload(
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

async function loadMonitorState(
  supabase: SupabaseClient<Database>,
  subscriptionId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from('alert_monitor_state')
    .select('active_alert_ids')
    .eq('subscription_id', subscriptionId)
    .maybeSingle()

  if (error) {
    throw new Error(`Monitor state read failed: ${error.message}`)
  }

  return (data as { active_alert_ids?: string[] } | null)?.active_alert_ids ?? []
}

async function saveMonitorState(
  supabase: SupabaseClient<Database>,
  subscriptionId: string,
  activeAlertIds: string[],
): Promise<void> {
  const now = new Date().toISOString()
  const { error } = await supabase.from('alert_monitor_state').upsert(
    {
      subscription_id: subscriptionId,
      active_alert_ids: activeAlertIds,
      updated_at: now,
    } as never,
    { onConflict: 'subscription_id' },
  )

  if (error) {
    throw new Error(`Monitor state write failed: ${error.message}`)
  }
}

async function loadGuestMonitorState(
  supabase: SupabaseClient<Database>,
  subscriberId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from('guest_alert_monitor_state')
    .select('active_alert_ids')
    .eq('subscriber_id', subscriberId)
    .maybeSingle()

  if (error) {
    throw new Error(`Guest monitor state read failed: ${error.message}`)
  }

  return (data as { active_alert_ids?: string[] } | null)?.active_alert_ids ?? []
}

async function saveGuestMonitorState(
  supabase: SupabaseClient<Database>,
  subscriberId: string,
  activeAlertIds: string[],
): Promise<void> {
  const now = new Date().toISOString()
  const { error } = await supabase.from('guest_alert_monitor_state').upsert(
    {
      subscriber_id: subscriberId,
      active_alert_ids: activeAlertIds,
      updated_at: now,
    } as never,
    { onConflict: 'subscriber_id' },
  )

  if (error) {
    throw new Error(`Guest monitor state write failed: ${error.message}`)
  }
}

async function insertUserAlert(
  supabase: SupabaseClient<Database>,
  input: {
    userId: string
    subscriptionId: string
    payload: SevereWeatherAlertPayload
  },
): Promise<string | null> {
  const { data, error } = await supabase
    .from('user_alerts')
    .insert({
      user_id: input.userId,
      subscription_id: input.subscriptionId,
      kind: 'severe_weather',
      payload: input.payload,
    } as never)
    .select('id')
    .single()

  if (error?.code === '23505') {
    return null
  }

  if (error || !(data as { id?: string } | null)?.id) {
    throw new Error(`user_alerts insert failed: ${error?.message ?? 'missing id'}`)
  }

  return (data as { id: string }).id
}

async function insertGuestDelivery(
  supabase: SupabaseClient<Database>,
  input: { subscriberId: string; alertId: string },
): Promise<string | null> {
  const { data, error } = await supabase
    .from('guest_alert_deliveries')
    .insert({
      subscriber_id: input.subscriberId,
      alert_id: input.alertId,
    } as never)
    .select('id')
    .single()

  if (error?.code === '23505') {
    return null
  }

  if (error || !(data as { id?: string } | null)?.id) {
    throw new Error(`guest_alert_deliveries insert failed: ${error?.message ?? 'missing id'}`)
  }

  return (data as { id: string }).id
}

async function claimPhaseChannels(
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
    for (const channel of CHANNELS) {
      if (channel === 'in_app') continue
      await claimDelivery(supabase, {
        warningEventId: input.warningEventId,
        lifecyclePhase: input.phase,
        channel,
        subscriberKind: input.subscriberKind,
        subscriberId: input.subscriberId,
        protectedPlaceKey: input.protectedPlaceKey,
        payload,
      })
    }
    return 'claimed'
  } catch (error) {
    console.error('[bitwatch-outbox] claim failed', error)
    return 'unavailable'
  }
}

async function loadHarmAlerts(
  supabase: SupabaseClient<Database>,
): Promise<NWSAlertDetail[]> {
  try {
    const canonical = await loadCanonicalActiveAlerts(supabase)
    if (canonical) return filterSevereMonitorAlerts(canonical.alerts)
  } catch (error) {
    console.error('[bitwatch-monitor] canonical load failed', error)
  }
  return filterSevereMonitorAlerts(await fetchHarmWarningAlerts())
}

async function resolveEndedAlert(
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

function alreadyTracked(previousSet: Set<string>, alert: NWSAlertDetail): boolean {
  return previousSet.has(eventKey(alert)) || previousSet.has(alert.id)
}

function coveringKeys(alerts: NWSAlertDetail[]): Set<string> {
  const keys = new Set<string>()
  for (const alert of alerts) {
    keys.add(eventKey(alert))
    keys.add(alert.id)
  }
  return keys
}

function trackingIds(alerts: NWSAlertDetail[]): string[] {
  return [...coveringKeys(alerts)]
}

export type SevereMonitorHooks = {
  onNewAlert?: (item: MonitorNewAlert) => Promise<void>
  onNewGuestAlert?: (item: MonitorNewGuestAlert) => Promise<void>
}

type PointKeyCache = Map<string, Set<string>>

async function pointActiveKeysForPin(
  lat: number,
  lon: number,
  needsPointFallback: boolean,
  cache: PointKeyCache,
  errors: string[],
): Promise<Set<string> | undefined> {
  if (!needsPointFallback) return undefined
  const key = pointKey(lat, lon)
  const cached = cache.get(key)
  if (cached) return cached
  try {
    const details = await fetchActiveAlertsDetail({ point: { lat, lon } })
    const ids = new Set<string>()
    for (const detail of details) {
      ids.add(detail.id)
      if (detail.warningEventId) ids.add(detail.warningEventId)
    }
    cache.set(key, ids)
    return ids
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'point fetch failed'
    errors.push(`point:${key}: ${msg}`)
    const empty = new Set<string>()
    cache.set(key, empty)
    return empty
  }
}

/**
 * Match Protected Places to harm-causing Warning Events and queue Delivery.
 * CON updates keep one event key. Cancel/expire is not an all-clear.
 * Never infers quiet from a failed national fetch.
 */
export async function runSevereAlertMonitor(
  supabase: SupabaseClient<Database>,
  hooks: SevereMonitorHooks = {},
): Promise<SevereMonitorRunResult> {
  const subscriptions = await fetchEnabledSevereSubscriptions(supabase)
  const guests = await fetchEnabledGuestSubscribers(supabase)
  const result: SevereMonitorRunResult = {
    subscriptionsChecked: subscriptions.length,
    guestSubscribersChecked: guests.length,
    uniquePoints: 0,
    newAlerts: 0,
    guestNewAlerts: 0,
    endedAlerts: 0,
    guestEndedAlerts: 0,
    scoutAlerts: 0,
    allClears: 0,
    errors: [],
  }

  if (subscriptions.length === 0 && guests.length === 0) {
    return result
  }

  result.uniquePoints = new Set([
    ...subscriptions.map((sub) => pointKey(sub.latitude, sub.longitude)),
    ...guests.map((guest) => pointKey(guest.latitude, guest.longitude)),
  ]).size

  let nationalAlerts: NWSAlertDetail[]
  try {
    nationalAlerts = await loadHarmAlerts(supabase)
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'NWS fetch failed'
    result.errors.push(`national: ${msg}`)
    return result
  }

  const needsPointFallback = nationalAlerts.some((alert) => !alert.geometry)
  const pointCache: PointKeyCache = new Map()
  const nowcastCache = new Map<string, boolean>()

  async function nowcastWet(lat: number, lon: number): Promise<boolean> {
    const key = pointKey(lat, lon)
    const cached = nowcastCache.get(key)
    if (cached != null) return cached
    const wet = await pinNowcastIsWet(lat, lon)
    nowcastCache.set(key, wet)
    return wet
  }

  for (const subscription of subscriptions) {
    try {
      const pointKeys = await pointActiveKeysForPin(
        subscription.latitude,
        subscription.longitude,
        needsPointFallback,
        pointCache,
        result.errors,
      )
      await processAccountPlace(
        supabase,
        subscription,
        nationalAlerts,
        pointKeys,
        result,
        hooks,
        nowcastWet,
      )
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'subscription monitor failed'
      result.errors.push(`${subscription.id}: ${msg}`)
    }
  }

  for (const subscriber of guests) {
    try {
      const pointKeys = await pointActiveKeysForPin(
        subscriber.latitude,
        subscriber.longitude,
        needsPointFallback,
        pointCache,
        result.errors,
      )
      await processGuestPlace(
        supabase,
        subscriber,
        nationalAlerts,
        pointKeys,
        result,
        hooks,
        nowcastWet,
      )
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'guest monitor failed'
      result.errors.push(`guest:${subscriber.id}: ${msg}`)
    }
  }

  return result
}

async function processAccountPlace(
  supabase: SupabaseClient<Database>,
  subscription: MonitorSubscription,
  nationalAlerts: NWSAlertDetail[],
  pointActiveKeys: Set<string> | undefined,
  result: SevereMonitorRunResult,
  hooks: SevereMonitorHooks,
  nowcastWet: (lat: number, lon: number) => Promise<boolean>,
): Promise<void> {
  const prefs = hazardPrefsFrom(subscription)
  const currentAlerts = coveringAlerts(
    subscription.latitude,
    subscription.longitude,
    nationalAlerts,
    pointActiveKeys,
  )
  const currentIds = trackingIds(currentAlerts)
  const previousIds = await loadMonitorState(supabase, subscription.id)
  const previousSet = new Set(previousIds)
  const liveKeys = coveringKeys(currentAlerts)

  for (const alert of currentAlerts) {
    const phase = alreadyTracked(previousSet, alert) ? 'upgrade' : 'new'
    if (phase === 'upgrade' && !(prefs.notifyUpgrades && isIbWUpgrade(alert))) continue
    if (phase === 'new' && !wantsHazard(alert.event, prefs)) continue
    if (phase === 'upgrade' && !wantsHazard(alert.event, prefs)) continue

    await deliverAccountPhase({
      supabase,
      subscription,
      alert,
      phase,
      result,
      hooks,
    })
  }

  for (const prevId of previousIds) {
    if (liveKeys.has(prevId)) continue
    const resolved = await resolveEndedAlert(supabase, prevId, nationalAlerts)
    if (liveKeys.has(eventKey(resolved)) || liveKeys.has(resolved.id)) continue
    if (
      matchProtectedPlace(
        subscription.latitude,
        subscription.longitude,
        resolved,
        pointActiveKeys,
      ).covered &&
      currentAlerts.some((alert) => eventKey(alert) === eventKey(resolved))
    ) {
      continue
    }
    if (resolved.event !== 'Warning ended' && !wantsHazard(resolved.event, prefs)) continue

    const delivered = await deliverAccountPhase({
      supabase,
      subscription,
      alert: resolved,
      phase: 'ended',
      result,
      hooks,
    })
    if (delivered) result.endedAlerts += 1
  }

  if (currentAlerts.length === 0) {
    const hit = scoutApproachingPlace(subscription.latitude, subscription.longitude, nationalAlerts)
    if (hit) {
      const delivered = await deliverAccountPhase({
        supabase,
        subscription,
        alert: hit.source,
        phase: 'scout',
        result,
        hooks,
        scout: {
          minutesAhead: hit.minutesAhead,
          nowcastWet: await nowcastWet(subscription.latitude, subscription.longitude),
        },
      })
      if (delivered) result.scoutAlerts += 1
    }
  }

  await saveMonitorState(supabase, subscription.id, currentIds)
}

async function deliverAccountPhase(input: {
  supabase: SupabaseClient<Database>
  subscription: MonitorSubscription
  alert: NWSAlertDetail
  phase: DeliveryPhase
  result: SevereMonitorRunResult
  hooks: SevereMonitorHooks
  scout?: { minutesAhead: number; nowcastWet: boolean }
}): Promise<boolean> {
  const { supabase, subscription, alert, phase, result, hooks, scout } = input
  const payload = buildWarningPayload(
    subscription.locationLabel,
    subscription.saved_location_id,
    alert,
    phase,
    '/dashboard',
    scout,
  )
  const userAlertId = await insertUserAlert(supabase, {
    userId: subscription.user_id,
    subscriptionId: subscription.id,
    payload,
  })
  if (!userAlertId) return false

  const claimed = await claimPhaseChannels(supabase, {
    warningEventId: eventKey(alert),
    phase,
    subscriberKind: 'account',
    subscriberId: subscription.user_id,
    protectedPlaceKey: subscription.saved_location_id,
    payload,
    method: alert.geometry ? 'polygon' : 'point-active',
  })
  if (claimed === 'duplicate') return true

  if (phase === 'new' || phase === 'upgrade') result.newAlerts += 1
  await hooks.onNewAlert?.({ subscription, alert, userAlertId, payload })
  return true
}

async function processGuestPlace(
  supabase: SupabaseClient<Database>,
  subscriber: GuestAlertSubscriber,
  nationalAlerts: NWSAlertDetail[],
  pointActiveKeys: Set<string> | undefined,
  result: SevereMonitorRunResult,
  hooks: SevereMonitorHooks,
  nowcastWet: (lat: number, lon: number) => Promise<boolean>,
): Promise<void> {
  const prefs: HazardDeliveryPrefs = hazardPrefsFrom(subscriber)
  const currentAlerts = coveringAlerts(
    subscriber.latitude,
    subscriber.longitude,
    nationalAlerts,
    pointActiveKeys,
  )
  const currentIds = trackingIds(currentAlerts)
  const previousIds = await loadGuestMonitorState(supabase, subscriber.id)
  const previousSet = new Set(previousIds)
  const liveKeys = coveringKeys(currentAlerts)

  for (const alert of currentAlerts) {
    const phase = alreadyTracked(previousSet, alert) ? 'upgrade' : 'new'
    if (phase === 'upgrade' && !(prefs.notifyUpgrades && isIbWUpgrade(alert))) continue
    if (!wantsHazard(alert.event, prefs)) continue

    const delivered = await deliverGuestPhase({
      supabase,
      subscriber,
      alert,
      phase,
      result,
      hooks,
    })
    if (delivered && (phase === 'new' || phase === 'upgrade')) {
      result.guestNewAlerts += 1
    }
  }

  for (const prevId of previousIds) {
    if (liveKeys.has(prevId)) continue
    const resolved = await resolveEndedAlert(supabase, prevId, nationalAlerts)
    if (liveKeys.has(eventKey(resolved)) || liveKeys.has(resolved.id)) continue
    if (resolved.event !== 'Warning ended' && !wantsHazard(resolved.event, prefs)) continue

    const delivered = await deliverGuestPhase({
      supabase,
      subscriber,
      alert: resolved,
      phase: 'ended',
      result,
      hooks,
    })
    if (delivered) result.guestEndedAlerts += 1
  }

  if (currentAlerts.length === 0) {
    const hit = scoutApproachingPlace(subscriber.latitude, subscriber.longitude, nationalAlerts)
    if (hit) {
      const delivered = await deliverGuestPhase({
        supabase,
        subscriber,
        alert: hit.source,
        phase: 'scout',
        result,
        hooks,
        scout: {
          minutesAhead: hit.minutesAhead,
          nowcastWet: await nowcastWet(subscriber.latitude, subscriber.longitude),
        },
      })
      if (delivered) result.scoutAlerts += 1
    }
  }

  await saveGuestMonitorState(supabase, subscriber.id, currentIds)
}

async function deliverGuestPhase(input: {
  supabase: SupabaseClient<Database>
  subscriber: GuestAlertSubscriber
  alert: NWSAlertDetail
  phase: DeliveryPhase
  result: SevereMonitorRunResult
  hooks: SevereMonitorHooks
  scout?: { minutesAhead: number; nowcastWet: boolean }
}): Promise<boolean> {
  const { supabase, subscriber, alert, phase, hooks, scout } = input
  const payload = buildWarningPayload(
    subscriber.locationLabel,
    subscriber.id,
    alert,
    phase,
    guestManagePath(subscriber.id),
    scout,
  )
  const deliveryId = await insertGuestDelivery(supabase, {
    subscriberId: subscriber.id,
    alertId: payload.alertId,
  })
  if (!deliveryId) return false

  const claimed = await claimPhaseChannels(supabase, {
    warningEventId: eventKey(alert),
    phase,
    subscriberKind: 'guest',
    subscriberId: subscriber.id,
    protectedPlaceKey: pointKey(subscriber.latitude, subscriber.longitude),
    payload,
    method: alert.geometry ? 'polygon' : 'point-active',
  })
  if (claimed === 'duplicate') return true

  await hooks.onNewGuestAlert?.({ subscriber, alert, deliveryId, payload })
  return true
}
