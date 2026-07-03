import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'
import {
  fetchUserEmailForAlert,
  markSevereAlertEmailSent,
} from '@/lib/services/severe-alert-email-db'
import { sendSevereAlertEmail } from '@/lib/services/severe-alert-email-service'
import type { MonitorNewAlert } from '@/lib/services/severe-alert-types'

export async function deliverSevereAlertEmail(
  supabase: SupabaseClient<Database>,
  item: MonitorNewAlert,
): Promise<{ sent: boolean; reason?: string }> {
  const email = await fetchUserEmailForAlert(supabase, item.subscription.user_id)
  if (!email) {
    return { sent: false, reason: 'User email not found' }
  }

  const result = await sendSevereAlertEmail({ email, payload: item.payload })
  if (result.sent) {
    await markSevereAlertEmailSent(supabase, item.userAlertId)
  }

  return result
}
