import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'

export async function fetchUserEmailForAlert(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<string | null> {
  // Profiles are editable by their owner. Only Auth proves mailbox ownership.
  const { data, error } = await supabase.auth.admin.getUserById(userId)

  if (error) {
    console.error('[severe-alert-email] Auth lookup failed', error.message)
    return null
  }

  const user = data.user
  return user?.email_confirmed_at ? user.email?.trim() || null : null
}

export async function markSevereAlertEmailSent(
  supabase: SupabaseClient<Database>,
  userAlertId: string,
): Promise<void> {
  const { error } = await supabase
    .from('user_alerts')
    // @ts-expect-error - supabase-js Database generic mismatch
    .update({ email_sent_at: new Date().toISOString() })
    .eq('id', userAlertId)

  if (error) {
    console.error('[severe-alert-email] failed to mark sent', userAlertId, error)
    throw new Error(`Failed to mark email sent: ${error.message}`)
  }
}
