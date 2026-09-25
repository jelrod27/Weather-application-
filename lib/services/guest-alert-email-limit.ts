import { createHash } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'

/** Claims a recipient's email budget across all instances before changing tokens. */
export async function claimGuestEmailSlot(
  supabase: SupabaseClient<Database>,
  email: string,
): Promise<boolean> {
  const recipientHash = createHash('sha256').update(email.trim().toLowerCase()).digest('hex')
  const args = {
    p_recipient_hash: recipientHash,
  } satisfies Database['public']['Functions']['claim_guest_alert_email_slot']['Args']
  // The legacy Database schema is not fully inferred by this supabase-js
  // version. Keep the RPC argument contract checked above, as for other writers.
  const { data, error } = await supabase.rpc('claim_guest_alert_email_slot', args as never)
  if (error || typeof data !== 'boolean') throw new Error('Guest email quota unavailable')
  return data
}
