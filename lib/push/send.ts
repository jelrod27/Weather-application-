import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'
import { getVapidConfig } from '@/lib/push/vapid'
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
): Promise<PushRow[]> {
  let query = supabase.from('push_subscriptions').select('id, endpoint, p256dh, auth')
  query =
    'userId' in owner
      ? query.eq('user_id', owner.userId)
      : query.eq('guest_subscriber_id', owner.guestSubscriberId)
  const { data, error } = await query
  if (error) {
    console.error('[web-push] load subscriptions failed', error)
    return []
  }
  return (data ?? []) as PushRow[]
}

export async function sendSeverePushNotifications(
  supabase: SupabaseClient<Database>,
  owner: PushOwner,
  payload: SevereWeatherAlertPayload,
): Promise<{ sent: number; failed: number; skipped: boolean }> {
  const vapid = getVapidConfig()
  if (!vapid) return { sent: 0, failed: 0, skipped: true }

  const subscriptions = await loadSubscriptions(supabase, owner)
  if (subscriptions.length === 0) return { sent: 0, failed: 0, skipped: true }

  const webpush = await import('web-push')
  webpush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey)

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

  for (const row of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: row.endpoint,
          keys: { p256dh: row.p256dh, auth: row.auth },
        },
        body,
        { TTL: ttlSeconds, urgency: 'high', topic: row.id.slice(0, 32) },
      )
      sent += 1
    } catch (error) {
      failed += 1
      const status = (error as { statusCode?: number }).statusCode
      if (status === 404 || status === 410) {
        await supabase.from('push_subscriptions').delete().eq('id', row.id)
      } else {
        console.error('[web-push] send failed', status ?? error)
      }
    }
  }

  return { sent, failed, skipped: false }
}
