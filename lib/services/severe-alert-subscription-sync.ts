import { createServiceRoleSupabaseClient } from '@/lib/supabase/service-role-client'
import { syncSevereAlertSubscriptions } from '@/lib/services/severe-alert-subscriptions'

/**
 * Best-effort sync after preferences or location changes.
 * Logs and swallows errors so user-facing requests still succeed.
 */
export async function trySyncSevereAlertSubscriptions(
  userId: string,
  notificationsEnabled: boolean,
): Promise<void> {
  const supabase = createServiceRoleSupabaseClient()
  if (!supabase) {
    console.warn('[severe-alert-subscriptions] service role unavailable; skip sync')
    return
  }

  try {
    await syncSevereAlertSubscriptions(supabase, userId, notificationsEnabled)
  } catch (error) {
    console.error('[severe-alert-subscriptions] sync failed', error)
  }
}

export async function tryEnableSevereAlertsForUser(userId: string): Promise<void> {
  const supabase = createServiceRoleSupabaseClient()
  if (!supabase) return

  const { data: prefs, error } = await supabase
    .from('user_preferences')
    .select('notifications_enabled')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    console.error('[severe-alert-subscriptions] preferences read failed', error.message)
    return
  }

  if (!prefs || !(prefs as { notifications_enabled: boolean }).notifications_enabled) return

  await trySyncSevereAlertSubscriptions(userId, true)
}
