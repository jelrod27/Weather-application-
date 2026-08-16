import type { SupabaseClient } from '@supabase/supabase-js'
import { getHubAlertsHref } from '@/lib/home/hub-links'
import type { Database } from '@/lib/supabase/types'
import { fetchHarmWarningAlerts, type NWSAlertDetail } from '@/lib/services/nws-alerts-service'
import { pointInNwsGeometry } from '@/lib/services/nws-alert-geometry'
import { filterSevereMonitorAlerts } from '@/lib/services/severe-alert-filter'
import { classifySevereAlertTier } from '@/lib/services/severe-alert-classifier'
import { fetchEnabledSevereSubscriptions } from '@/lib/services/severe-alert-subscriptions'
import { fetchEnabledGuestSubscribers } from '@/lib/services/guest-alert-subscribers'
import type { GuestAlertSubscriber } from '@/lib/services/guest-alert-subscribers'
import type {
  MonitorNewAlert,
  MonitorNewGuestAlert,
  SevereMonitorRunResult,
  SevereWeatherAlertPayload,
} from '@/lib/services/severe-alert-types'

function pointKey(lat: number, lon: number): string {
  return `${lat.toFixed(4)},${lon.toFixed(4)}`
}

function buildWarningPayload(
  locationName: string,
  savedLocationId: string,
  alert: NWSAlertDetail,
): SevereWeatherAlertPayload {
  const tier = classifySevereAlertTier(alert)
  return {
    alertId: alert.id,
    event: alert.event,
    headline: alert.headline,
    instruction: alert.instruction,
    severity: alert.severity,
    urgency: alert.urgency,
    expires: alert.expires,
    areaDesc: alert.areaDesc,
    locationName,
    savedLocationId,
    warningsHref: getHubAlertsHref(alert.id),
    tier,
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

export type SevereMonitorHooks = {
  onNewAlert?: (item: MonitorNewAlert) => Promise<void>
  onNewGuestAlert?: (item: MonitorNewGuestAlert) => Promise<void>
}

/**
 * Fetch national harm-causing warnings once, match saved pins and guest pins
 * to polygons, and write in-app / guest deliveries for newly covering events.
 * Never infers all-clear from an empty or failed fetch.
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
    nationalAlerts = filterSevereMonitorAlerts(await fetchHarmWarningAlerts())
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'NWS fetch failed'
    result.errors.push(`national: ${msg}`)
    return result
  }

  for (const subscription of subscriptions) {
    const currentAlerts = nationalAlerts.filter((alert) =>
      pointInNwsGeometry(subscription.latitude, subscription.longitude, alert.geometry),
    )
    const currentIds = currentAlerts.map((alert) => alert.id)

    try {
      const previousIds = await loadMonitorState(supabase, subscription.id)
      const previousSet = new Set(previousIds)
      const newAlerts = currentAlerts.filter((alert) => !previousSet.has(alert.id))

      let syncedIds = [...previousIds]

      for (const alert of newAlerts) {
        const payload = buildWarningPayload(
          subscription.locationLabel,
          subscription.saved_location_id,
          alert,
        )
        const userAlertId = await insertUserAlert(supabase, {
          userId: subscription.user_id,
          subscriptionId: subscription.id,
          payload,
        })
        if (!userAlertId) {
          syncedIds.push(alert.id)
          continue
        }
        result.newAlerts += 1
        syncedIds.push(alert.id)
        await saveMonitorState(supabase, subscription.id, syncedIds)
        await hooks.onNewAlert?.({ subscription, alert, userAlertId, payload })
      }

      await saveMonitorState(supabase, subscription.id, currentIds)
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'subscription monitor failed'
      result.errors.push(`${subscription.id}: ${msg}`)
    }
  }

  for (const subscriber of guests) {
    await processGuestSubscriber(supabase, subscriber, nationalAlerts, result, hooks)
  }

  return result
}

async function processGuestSubscriber(
  supabase: SupabaseClient<Database>,
  subscriber: GuestAlertSubscriber,
  nationalAlerts: NWSAlertDetail[],
  result: SevereMonitorRunResult,
  hooks: SevereMonitorHooks,
): Promise<void> {
  const currentAlerts = nationalAlerts.filter((alert) =>
    pointInNwsGeometry(subscriber.latitude, subscriber.longitude, alert.geometry),
  )
  const currentIds = currentAlerts.map((alert) => alert.id)

  try {
    const previousIds = await loadGuestMonitorState(supabase, subscriber.id)
    const previousSet = new Set(previousIds)
    const newAlerts = currentAlerts.filter((alert) => !previousSet.has(alert.id))

    let syncedIds = [...previousIds]

    for (const alert of newAlerts) {
      const payload = buildWarningPayload(subscriber.locationLabel, subscriber.id, alert)
      const deliveryId = await insertGuestDelivery(supabase, {
        subscriberId: subscriber.id,
        alertId: alert.id,
      })
      if (!deliveryId) {
        syncedIds.push(alert.id)
        continue
      }
      result.guestNewAlerts += 1
      syncedIds.push(alert.id)
      await saveGuestMonitorState(supabase, subscriber.id, syncedIds)
      await hooks.onNewGuestAlert?.({ subscriber, alert, deliveryId, payload })
    }

    await saveGuestMonitorState(supabase, subscriber.id, currentIds)
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'guest monitor failed'
    result.errors.push(`guest:${subscriber.id}: ${msg}`)
  }
}
