import type { SupabaseClient } from '@supabase/supabase-js'
import { loadCanonicalActiveAlerts } from '@/lib/bitwatch/ingest'
import { pinNowcastIsWet } from '@/lib/bitwatch/scout-nowcast'
import type { Database } from '@/lib/supabase/types'
import {
  fetchActiveAlertsDetail,
  fetchHarmWarningAlerts,
  type NWSAlertDetail,
} from '@/lib/services/nws-alerts-service'
import { filterSevereMonitorAlerts } from '@/lib/services/severe-alert-filter'
import { fetchEnabledSevereSubscriptions } from '@/lib/services/severe-alert-subscriptions'
import { fetchEnabledGuestSubscribers } from '@/lib/services/guest-alert-subscribers'
import type {
  SevereMonitorHooks,
  SevereMonitorRunResult,
} from '@/lib/services/severe-alert-types'
import { processAccountPlace } from './severe-alert-monitor-account'
import {
  mapWithConcurrency,
  SEVERE_MONITOR_CONCURRENCY,
} from './severe-alert-monitor-concurrency'
import { processGuestPlace } from './severe-alert-monitor-guest'
import { pointKey } from './severe-alert-monitor-shared'

export type { SevereMonitorHooks, SevereMonitorRunResult }

type PointKeyCache = Map<string, Promise<Set<string>>>

async function loadHarmAlerts(
  supabase: SupabaseClient<Database>,
): Promise<NWSAlertDetail[]> {
  try {
    const canonical = await loadCanonicalActiveAlerts(supabase)
    if (canonical?.freshness === 'fresh') {
      return filterSevereMonitorAlerts(canonical.alerts)
    }
  } catch (error) {
    console.error('[bitwatch-monitor] canonical load failed', error)
  }
  return filterSevereMonitorAlerts(await fetchHarmWarningAlerts())
}

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
  const pending = (async () => {
    try {
      const details = await fetchActiveAlertsDetail({ point: { lat, lon } })
      const ids = new Set<string>()
      for (const detail of details) {
        ids.add(detail.id)
        if (detail.warningEventId) ids.add(detail.warningEventId)
      }
      return ids
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'point fetch failed'
      errors.push(`point:${key}: ${msg}`)
      return new Set<string>()
    }
  })()
  cache.set(key, pending)
  return pending
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
  const nowcastCache = new Map<string, Promise<boolean>>()

  async function nowcastWet(lat: number, lon: number): Promise<boolean> {
    const key = pointKey(lat, lon)
    const cached = nowcastCache.get(key)
    if (cached) return cached
    const pending = pinNowcastIsWet(lat, lon)
    nowcastCache.set(key, pending)
    return pending
  }

  await mapWithConcurrency(subscriptions, SEVERE_MONITOR_CONCURRENCY, async (subscription) => {
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
  })

  await mapWithConcurrency(guests, SEVERE_MONITOR_CONCURRENCY, async (subscriber) => {
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
  })

  return result
}
