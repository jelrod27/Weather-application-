import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'
import {
  fetchUserEmailForAlert,
  markSevereAlertEmailSent,
} from '@/lib/services/severe-alert-email-db'
import { sendSevereAlertEmail } from '@/lib/services/severe-alert-email-service'
import { shouldEmailSevereAlertTier } from '@/lib/services/severe-alert-classifier'
import type { MonitorNewAlert } from '@/lib/services/severe-alert-types'

export async function deliverSevereAlertEmail(
  supabase: SupabaseClient<Database>,
  item: MonitorNewAlert,
): Promise<{ sent: boolean; skipped?: boolean; reason?: string }> {
  const tier = item.payload.tier ?? 'standard'
  if (!shouldEmailSevereAlertTier(tier)) {
    return { sent: false, skipped: true, reason: 'In-app only for standard tier' }
  }

  const email = await fetchUserEmailForAlert(supabase, item.subscription.user_id)
  if (!email) {
    return { sent: false, reason: 'User email not found' }
  }

  const result = await sendSevereAlertEmail({ email, payload: item.payload })
  if (!result.sent) {
    return result
  }

  try {
    await markSevereAlertEmailSent(supabase, item.userAlertId)
  } catch (error) {
    return {
      sent: false,
      reason: error instanceof Error ? error.message : 'Failed to persist email_sent_at',
    }
  }

  return { sent: true }
}
