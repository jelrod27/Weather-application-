import type { SupabaseClient } from '@supabase/supabase-js'
import { guestManagePath } from '@/lib/alerts/guest-tokens'
import {
  hazardPrefsFrom,
  isIbWUpgrade,
  wantsHazard,
  type DeliveryPhase,
  type HazardDeliveryPrefs,
} from '@/lib/bitwatch/delivery-policy'
import { coveringAlerts, eventKey } from '@/lib/bitwatch/match'
import { scoutApproachingPlace } from '@/lib/bitwatch/scout'
import type { Database } from '@/lib/supabase/types'
import type { GuestAlertSubscriber } from '@/lib/services/guest-alert-subscribers'
import type { NWSAlertDetail } from '@/lib/services/nws-alerts-service'
import type { SevereMonitorHooks, SevereMonitorRunResult } from '@/lib/services/severe-alert-types'
import {
  alreadyTracked,
  buildWarningPayload,
  claimPhaseChannels,
  coveringKeys,
  pointKey,
  rememberEndedKeys,
  resolveEndedAlert,
  stillCoveredByCurrent,
  trackingIds,
} from './severe-alert-monitor-shared'

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

export async function processGuestPlace(
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
  const endedSeen = new Set<string>()

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
    if (rememberEndedKeys(endedSeen, resolved, prevId)) continue
    if (
      stillCoveredByCurrent(
        subscriber.latitude,
        subscriber.longitude,
        resolved,
        currentAlerts,
        pointActiveKeys,
      )
    ) {
      continue
    }

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
    if (hit && wantsHazard(hit.source.event, prefs)) {
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
