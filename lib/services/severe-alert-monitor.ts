import type { SupabaseClient } from '@supabase/supabase-js'
import { getHubAlertsHref } from '@/lib/home/hub-links'
import type { Database } from '@/lib/supabase/types'
import { fetchActiveAlertsDetail, type NWSAlertDetail } from '@/lib/services/nws-alerts-service'
import { filterSevereMonitorAlerts } from '@/lib/services/severe-alert-filter'
import { classifySevereAlertTier } from '@/lib/services/severe-alert-classifier'
import { fetchEnabledSevereSubscriptions } from '@/lib/services/severe-alert-subscriptions'
import type {
  MonitorClearedLocation,
  MonitorNewAlert,
  MonitorSubscription,
  SevereMonitorRunResult,
  SevereWeatherAlertPayload,
  SevereWeatherAllClearPayload,
} from '@/lib/services/severe-alert-types'

const BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, '') || 'https://www.16bitweather.co'

function pointKey(lat: number, lon: number): string {
  return `${lat.toFixed(4)},${lon.toFixed(4)}`
}

function buildWarningPayload(
  subscription: MonitorSubscription,
  alert: NWSAlertDetail,
): SevereWeatherAlertPayload {
  const tier = classifySevereAlertTier(alert)
  return {
    alertId: alert.id,
    event: alert.event,
    headline: alert.headline,
    severity: alert.severity,
    urgency: alert.urgency,
    expires: alert.expires,
    areaDesc: alert.areaDesc,
    locationName: subscription.locationLabel,
    savedLocationId: subscription.saved_location_id,
    warningsHref: getHubAlertsHref(alert.id),
    tier,
  }
}

function buildAllClearPayload(
  subscription: MonitorSubscription,
  clearedAlertIds: string[],
): SevereWeatherAllClearPayload {
  return {
    locationName: subscription.locationLabel,
    savedLocationId: subscription.saved_location_id,
    clearedAlertIds,
    warningsHref: `${BASE_URL}/warnings`,
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

async function insertUserAlert(
  supabase: SupabaseClient<Database>,
  input: {
    userId: string
    subscriptionId: string
    kind: 'severe_weather' | 'severe_weather_all_clear'
    payload: SevereWeatherAlertPayload | SevereWeatherAllClearPayload
  },
): Promise<string> {
  const { data, error } = await supabase
    .from('user_alerts')
    .insert({
      user_id: input.userId,
      subscription_id: input.subscriptionId,
      kind: input.kind,
      payload: input.payload,
    } as never)
    .select('id')
    .single()

  if (error || !(data as { id?: string } | null)?.id) {
    throw new Error(`user_alerts insert failed: ${error?.message ?? 'missing id'}`)
  }

  return (data as { id: string }).id
}

export type SevereMonitorHooks = {
  onNewAlert?: (item: MonitorNewAlert) => Promise<void>
  onAllClear?: (item: MonitorClearedLocation) => Promise<void>
}

/**
 * Poll NWS point alerts for each enabled subscription, diff against stored state,
 * and write in-app alerts for newly active or cleared warnings.
 */
export async function runSevereAlertMonitor(
  supabase: SupabaseClient<Database>,
  hooks: SevereMonitorHooks = {},
): Promise<SevereMonitorRunResult> {
  const subscriptions = await fetchEnabledSevereSubscriptions(supabase)
  const result: SevereMonitorRunResult = {
    subscriptionsChecked: subscriptions.length,
    uniquePoints: 0,
    newAlerts: 0,
    allClears: 0,
    errors: [],
  }

  if (subscriptions.length === 0) {
    return result
  }

  const pointCache = new Map<string, NWSAlertDetail[]>()
  const uniquePoints = new Set<string>()

  for (const sub of subscriptions) {
    const key = pointKey(sub.latitude, sub.longitude)
    uniquePoints.add(key)
    if (!pointCache.has(key)) {
      try {
        const alerts = await fetchActiveAlertsDetail({
          point: { lat: sub.latitude, lon: sub.longitude },
        })
        pointCache.set(key, filterSevereMonitorAlerts(alerts))
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'NWS fetch failed'
        result.errors.push(`${key}: ${msg}`)
        pointCache.set(key, [])
      }
    }
  }

  result.uniquePoints = uniquePoints.size

  for (const subscription of subscriptions) {
    const key = pointKey(subscription.latitude, subscription.longitude)
    const currentAlerts = pointCache.get(key) ?? []
    const currentIds = currentAlerts.map((a) => a.id)

    try {
      const previousIds = await loadMonitorState(supabase, subscription.id)
      const previousSet = new Set(previousIds)
      const currentSet = new Set(currentIds)

      const newAlerts = currentAlerts.filter((a) => !previousSet.has(a.id))
      const clearedIds = previousIds.filter((id) => !currentSet.has(id))

      for (const alert of newAlerts) {
        const payload = buildWarningPayload(subscription, alert)
        const userAlertId = await insertUserAlert(supabase, {
          userId: subscription.user_id,
          subscriptionId: subscription.id,
          kind: 'severe_weather',
          payload,
        })
        result.newAlerts += 1
        await hooks.onNewAlert?.({ subscription, alert, userAlertId, payload })
      }

      if (clearedIds.length > 0 && previousIds.length > 0 && currentIds.length === 0) {
        const payload = buildAllClearPayload(subscription, clearedIds)
        const userAlertId = await insertUserAlert(supabase, {
          userId: subscription.user_id,
          subscriptionId: subscription.id,
          kind: 'severe_weather_all_clear',
          payload,
        })
        result.allClears += 1
        await hooks.onAllClear?.({
          subscription,
          clearedAlertIds: clearedIds,
          userAlertId,
          payload,
        })
      }

      await saveMonitorState(supabase, subscription.id, currentIds)
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'subscription monitor failed'
      result.errors.push(`${subscription.id}: ${msg}`)
    }
  }

  return result
}
