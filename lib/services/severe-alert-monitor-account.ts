import type { SupabaseClient } from '@supabase/supabase-js'
import {
  hazardPrefsFrom,
  isIbWUpgrade,
  wantsHazard,
  type DeliveryPhase,
} from '@/lib/bitwatch/delivery-policy'
import { coveringAlerts, eventKey } from '@/lib/bitwatch/match'
import { scoutApproachingPlace } from '@/lib/bitwatch/scout'
import type { Database } from '@/lib/supabase/types'
import type { NWSAlertDetail } from '@/lib/services/nws-alerts-service'
import type {
  MonitorSubscription,
  SevereMonitorHooks,
  SevereMonitorRunResult,
  SevereWeatherAlertPayload,
} from '@/lib/services/severe-alert-types'
import {
  alreadyTracked,
  buildWarningPayload,
  claimPhaseChannels,
  coveringKeys,
  rememberEndedKeys,
  resolveEndedAlert,
  stillCoveredByCurrent,
  trackingIds,
} from './severe-alert-monitor-shared'

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

export async function processAccountPlace(
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
  const endedSeen = new Set<string>()

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
    if (rememberEndedKeys(endedSeen, resolved, prevId)) continue
    if (
      stillCoveredByCurrent(
        subscription.latitude,
        subscription.longitude,
        resolved,
        currentAlerts,
        pointActiveKeys,
      )
    ) {
      continue
    }

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
    if (hit && wantsHazard(hit.source.event, prefs)) {
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
