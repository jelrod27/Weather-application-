import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'
import { sendSevereAlertEmail } from '@/lib/services/severe-alert-email-service'
import { shouldEmailSevereAlertTier } from '@/lib/services/severe-alert-classifier'
import type { MonitorNewGuestAlert } from '@/lib/services/severe-alert-types'

export async function deliverGuestSevereAlertEmail(
  supabase: SupabaseClient<Database>,
  item: MonitorNewGuestAlert,
): Promise<{ sent: boolean; skipped?: boolean; reason?: string }> {
  const tier = item.payload.tier ?? 'standard'
  if (!shouldEmailSevereAlertTier(tier)) {
    return { sent: false, skipped: true, reason: 'Email skipped for standard tier' }
  }

  const result = await sendSevereAlertEmail({
    email: item.subscriber.email,
    payload: item.payload,
  })
  if (!result.sent) return result

  const { error } = await supabase
    .from('guest_alert_deliveries')
    .update({ email_sent_at: new Date().toISOString() } as never)
    .eq('id', item.deliveryId)

  if (error) {
    return { sent: false, reason: `Failed to persist guest email_sent_at: ${error.message}` }
  }

  return { sent: true }
}
