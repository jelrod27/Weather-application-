import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'
import { guestVerifyExpiry, hashGuestToken, newGuestToken } from '@/lib/alerts/guest-tokens'

export type GuestAlertSubscriber = {
  id: string
  email: string
  latitude: number
  longitude: number
  locationLabel: string
  enabled: boolean
  verifiedAt: string | null
}

type GuestRow = {
  id: string
  email: string
  latitude: number
  longitude: number
  location_label: string
  enabled: boolean
  verified_at: string | null
  manage_token_hash: string
}

function mapRow(row: GuestRow): GuestAlertSubscriber {
  return {
    id: row.id,
    email: row.email,
    latitude: row.latitude,
    longitude: row.longitude,
    locationLabel: row.location_label,
    enabled: row.enabled,
    verifiedAt: row.verified_at,
  }
}

export async function fetchEnabledGuestSubscribers(
  supabase: SupabaseClient<Database>,
): Promise<GuestAlertSubscriber[]> {
  const { data, error } = await supabase
    .from('guest_alert_subscribers')
    .select('id, email, latitude, longitude, location_label, enabled, verified_at, manage_token_hash')
    .eq('enabled', true)
    .not('verified_at', 'is', null)

  if (error) {
    console.error('[guest-alert-subscribers] fetch enabled failed', error)
    return []
  }

  return ((data ?? []) as GuestRow[]).map(mapRow)
}

export async function upsertGuestSubscriber(
  supabase: SupabaseClient<Database>,
  input: { email: string; latitude: number; longitude: number; locationLabel: string },
): Promise<{
  subscriber: GuestAlertSubscriber
  verifyToken: string | null
  manageToken: string | null
  alreadyVerified: boolean
}> {
  const email = input.email.trim().toLowerCase()
  const { data: existing, error: lookupError } = await supabase
    .from('guest_alert_subscribers')
    .select('id, email, latitude, longitude, location_label, enabled, verified_at, manage_token_hash')
    .eq('email', email)
    .maybeSingle()

  if (lookupError) {
    throw new Error(`Guest lookup failed: ${lookupError.message}`)
  }

  const row = existing as GuestRow | null
  const now = new Date().toISOString()

  if (row?.verified_at) {
    const manageToken = newGuestToken()
    const { error } = await supabase
      .from('guest_alert_subscribers')
      .update({
        latitude: input.latitude,
        longitude: input.longitude,
        location_label: input.locationLabel,
        enabled: true,
        manage_token_hash: hashGuestToken(manageToken),
        updated_at: now,
      } as never)
      .eq('id', row.id)

    if (error) throw new Error(`Guest pin update failed: ${error.message}`)

    return {
      subscriber: {
        ...mapRow(row),
        latitude: input.latitude,
        longitude: input.longitude,
        locationLabel: input.locationLabel,
        enabled: true,
      },
      verifyToken: null,
      manageToken,
      alreadyVerified: true,
    }
  }

  const verifyToken = newGuestToken()
  const manageToken = newGuestToken()
  const payload = {
    email,
    latitude: input.latitude,
    longitude: input.longitude,
    location_label: input.locationLabel,
    enabled: true,
    verified_at: null,
    verify_token_hash: hashGuestToken(verifyToken),
    verify_token_expires_at: guestVerifyExpiry(),
    manage_token_hash: hashGuestToken(manageToken),
    updated_at: now,
  }

  if (row) {
    const { error } = await supabase
      .from('guest_alert_subscribers')
      .update(payload as never)
      .eq('id', row.id)
    if (error) throw new Error(`Guest resend update failed: ${error.message}`)
    return {
      subscriber: { ...mapRow(row), ...input, locationLabel: input.locationLabel, verifiedAt: null },
      verifyToken,
      manageToken,
      alreadyVerified: false,
    }
  }

  const { data: inserted, error: insertError } = await supabase
    .from('guest_alert_subscribers')
    .insert({ ...payload, created_at: now } as never)
    .select('id, email, latitude, longitude, location_label, enabled, verified_at, manage_token_hash')
    .single()

  if (insertError || !inserted) {
    throw new Error(`Guest insert failed: ${insertError?.message ?? 'missing row'}`)
  }

  return {
    subscriber: mapRow(inserted as GuestRow),
    verifyToken,
    manageToken,
    alreadyVerified: false,
  }
}

export async function verifyGuestSubscriber(
  supabase: SupabaseClient<Database>,
  token: string,
): Promise<GuestAlertSubscriber | null> {
  const hash = hashGuestToken(token)
  const { data, error } = await supabase
    .from('guest_alert_subscribers')
    .select('id, email, latitude, longitude, location_label, enabled, verified_at, manage_token_hash, verify_token_expires_at')
    .eq('verify_token_hash', hash)
    .maybeSingle()

  if (error) throw new Error(`Guest verify lookup failed: ${error.message}`)
  const row = data as (GuestRow & { verify_token_expires_at?: string | null }) | null
  if (!row) return null
  if (row.verify_token_expires_at && new Date(row.verify_token_expires_at).getTime() < Date.now()) {
    return null
  }

  const now = new Date().toISOString()
  const { error: updateError } = await supabase
    .from('guest_alert_subscribers')
    .update({
      verified_at: now,
      verify_token_hash: null,
      verify_token_expires_at: null,
      updated_at: now,
    } as never)
    .eq('id', row.id)

  if (updateError) throw new Error(`Guest verify update failed: ${updateError.message}`)
  return { ...mapRow(row), verifiedAt: now }
}

export async function findGuestByManageToken(
  supabase: SupabaseClient<Database>,
  token: string,
): Promise<GuestAlertSubscriber | null> {
  const { data, error } = await supabase
    .from('guest_alert_subscribers')
    .select('id, email, latitude, longitude, location_label, enabled, verified_at, manage_token_hash')
    .eq('manage_token_hash', hashGuestToken(token))
    .maybeSingle()

  if (error) throw new Error(`Guest manage lookup failed: ${error.message}`)
  return data ? mapRow(data as GuestRow) : null
}

export async function setGuestEnabled(
  supabase: SupabaseClient<Database>,
  subscriberId: string,
  enabled: boolean,
): Promise<void> {
  const { error } = await supabase
    .from('guest_alert_subscribers')
    .update({ enabled, updated_at: new Date().toISOString() } as never)
    .eq('id', subscriberId)
  if (error) throw new Error(`Guest enable update failed: ${error.message}`)
}

export async function deleteGuestSubscriber(
  supabase: SupabaseClient<Database>,
  subscriberId: string,
): Promise<void> {
  const { error } = await supabase.from('guest_alert_subscribers').delete().eq('id', subscriberId)
  if (error) throw new Error(`Guest delete failed: ${error.message}`)
}
