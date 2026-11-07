import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'
import { getVapidConfig } from '@/lib/push/vapid'
import { isAllowedPushEndpoint } from '@/lib/push/endpoint'
import { requestPublicHttps } from '@/lib/security/public-https'
import type { SevereWeatherAlertPayload } from '@/lib/services/severe-alert-types'

export type PushOwner =
  | { userId: string }
  | { guestSubscriberId: string }

type PushRow = {
  id: string
  endpoint: string
  p256dh: string
  auth: string
}

async function loadSubscriptions(
  supabase: SupabaseClient<Database>,
  owner: PushOwner,
  signal: AbortSignal,
): Promise<PushRow[]> {
  let query = supabase.from('push_subscriptions').select('id, endpoint, p256dh, auth')
  query =
    'userId' in owner
      ? query.eq('user_id', owner.userId)
      : query.eq('guest_subscriber_id', owner.guestSubscriberId)
  const { data, error } = await query.abortSignal(signal)
  if (error) {
    throw new Error(`Push subscription lookup failed: ${error.message}`)
  }
  return (data ?? []) as PushRow[]
}

async function retireSubscription(
  supabase: SupabaseClient<Database>,
  id: string,
  signal: AbortSignal,
): Promise<void> {
  try {
    await supabase.from('push_subscriptions').delete().eq('id', id).abortSignal(signal)
  } catch {
    // Cleanup is best effort; a later alert can retry removing the unusable row.
  }
}

export async function sendSeverePushNotifications(
  supabase: SupabaseClient<Database>,
  owner: PushOwner,
  payload: SevereWeatherAlertPayload,
): Promise<{ sent: number; failed: number; retired: number; skipped: boolean }> {
  const vapid = getVapidConfig()
  if (!vapid) return { sent: 0, failed: 0, retired: 0, skipped: true }

  // Includes subscription lookup, provider requests, and expired-row cleanup.
  const signal = AbortSignal.timeout(3_000)
  let subscriptions: PushRow[]
  try {
    subscriptions = await loadSubscriptions(supabase, owner, signal)
  } catch (error) {
    console.error('[web-push] load subscriptions failed', error)
    // The device count is unknown; count one failed recipient lookup so cron
    // monitoring distinguishes a database outage from a healthy no-device skip.
    return { sent: 0, failed: 1, retired: 0, skipped: false }
  }
  if (subscriptions.length === 0) return { sent: 0, failed: 0, retired: 0, skipped: true }

  const webpush = await import('web-push')

  const ttlSeconds = Math.max(
    60,
    Math.min(3_600, Math.floor((new Date(payload.expires).getTime() - Date.now()) / 1000) || 1_800),
  )
  const body = JSON.stringify({
    title: payload.event,
    body: (payload.instruction || payload.headline).slice(0, 180),
    url: payload.warningsHref,
    tag: payload.alertId,
  })

  let sent = 0
  let failed = 0
  let retired = 0
  // One budget for the entire recipient, regardless of stored device count.

  for (const [index, row] of subscriptions.entries()) {
    if (signal.aborted) {
      failed += subscriptions.length - index
      break
    }
    if (!isAllowedPushEndpoint(row.endpoint)) {
      retired += 1
      await retireSubscription(supabase, row.id, signal)
      continue
    }
    try {
      const details = webpush.generateRequestDetails(
        {
          endpoint: row.endpoint,
          keys: { p256dh: row.p256dh, auth: row.auth },
        },
        body,
        { TTL: ttlSeconds, urgency: 'high', topic: row.id.slice(0, 32), vapidDetails: vapid },
      )
      const response = await requestPublicHttps(details.endpoint, {
        method: 'POST', headers: details.headers, body: details.body,
        signal,
      })
      // Push-service acceptance is conveyed by the status, not the body. Never
      // follow redirects or wait for an unbounded body from a stored endpoint.
      const statusCode = response.statusCode ?? 0
      response.destroy()
      if (statusCode < 200 || statusCode >= 300) {
        throw Object.assign(new Error('Push service rejected delivery'), { statusCode })
      }
      sent += 1
    } catch (error) {
      const status = (error as { statusCode?: number }).statusCode
      if (status === 404 || status === 410) {
        retired += 1
        await retireSubscription(supabase, row.id, signal)
      } else {
        failed += 1
        console.error('[web-push] send failed', status ?? error)
      }
    }
  }

  return { sent, failed, retired, skipped: false }
}
