import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'

export async function fetchUserEmailForAlert(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    console.error('[severe-alert-email] profile lookup failed', error.message)
    return null
  }

  const email = (data as { email?: string } | null)?.email?.trim()
  return email || null
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
