import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '@/lib/supabase/types'
import type { DeliveryPhase } from '@/lib/bitwatch/delivery-policy'

export type DeliveryChannel = 'email' | 'push' | 'in_app'

export async function claimDelivery(
  supabase: SupabaseClient<Database>,
  input: {
    warningEventId: string
    lifecyclePhase: DeliveryPhase
    channel: DeliveryChannel
    subscriberKind: 'account' | 'guest'
    subscriberId: string
    protectedPlaceKey: string
    payload: Json
  },
): Promise<string | null> {
  const { data, error } = await supabase
    .from('bitwatch_deliveries')
    .insert({
      warning_event_id: input.warningEventId,
      lifecycle_phase: input.lifecyclePhase,
      channel: input.channel,
      subscriber_kind: input.subscriberKind,
      subscriber_id: input.subscriberId,
      protected_place_key: input.protectedPlaceKey,
      payload: input.payload,
    } as never)
    .select('id')
    .single()

  if (error?.code === '23505') return null
  if (error || !(data as { id?: string } | null)?.id) {
    throw new Error(`Delivery claim failed: ${error?.message ?? 'missing id'}`)
  }
  return (data as { id: string }).id
}

export async function markDeliveryAccepted(
  supabase: SupabaseClient<Database>,
  deliveryId: string,
): Promise<void> {
  const { error } = await supabase
    .from('bitwatch_deliveries')
    .update({ provider_accepted_at: new Date().toISOString() } as never)
    .eq('id', deliveryId)
  if (error) {
    console.error('[bitwatch-outbox] accept update failed', error)
  }
}
