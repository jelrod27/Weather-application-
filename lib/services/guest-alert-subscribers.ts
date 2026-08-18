import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'
import { guestVerifyExpiry, hashGuestToken, newGuestToken, parseSignedGuestManageToken } from '@/lib/alerts/guest-tokens'

import type { HazardDeliveryPrefs } from '@/lib/bitwatch/delivery-policy'
import { hazardPrefsFrom } from '@/lib/bitwatch/delivery-policy'

export type GuestAlertSubscriber = {
  id: string
  email: string
  latitude: number
  longitude: number
  locationLabel: string
  enabled: boolean
  verifiedAt: string | null
} & HazardDeliveryPrefs

const GUEST_SELECT =
  'id, email, latitude, longitude, location_label, enabled, verified_at, manage_token_hash, notify_tornado, notify_severe_thunderstorm, notify_flash_flood, notify_upgrades'

type GuestRow = {
  id: string
  email: string
  latitude: number
  longitude: number
  location_label: string
  enabled: boolean
  verified_at: string | null
  manage_token_hash: string
  notify_tornado?: boolean | null
  notify_severe_thunderstorm?: boolean | null
  notify_flash_flood?: boolean | null
  notify_upgrades?: boolean | null
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
    ...hazardPrefsFrom({
      notifyTornado: row.notify_tornado,
      notifySevereThunderstorm: row.notify_severe_thunderstorm,
      notifyFlashFlood: row.notify_flash_flood,
      notifyUpgrades: row.notify_upgrades,
    }),
  }
}

export async function fetchEnabledGuestSubscribers(
  supabase: SupabaseClient<Database>,
): Promise<GuestAlertSubscriber[]> {
  const { data, error } = await supabase
    .from('guest_alert_subscribers')
    .select(GUEST_SELECT)
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
  input: {
    email: string
    latitude: number
    longitude: number
    locationLabel: string
    notifyTornado?: boolean
    notifySevereThunderstorm?: boolean
    notifyFlashFlood?: boolean
    notifyUpgrades?: boolean
  },
): Promise<{
  subscriber: GuestAlertSubscriber
  verifyToken: string | null
  manageToken: string | null
  alreadyVerified: boolean
}> {
  const email = input.email.trim().toLowerCase()
  const prefs = hazardPrefsFrom(input)
  const dbPrefs = {
    notify_tornado: prefs.notifyTornado,
    notify_severe_thunderstorm: prefs.notifySevereThunderstorm,
    notify_flash_flood: prefs.notifyFlashFlood,
    notify_upgrades: prefs.notifyUpgrades,
  }
  const { data: existing, error: lookupError } = await supabase
    .from('guest_alert_subscribers')
    .select(GUEST_SELECT)
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
        ...dbPrefs,
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
        ...prefs,
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
    ...dbPrefs,
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
    .select(GUEST_SELECT)
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
    .select(`${GUEST_SELECT}, verify_token_expires_at`)
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
  const signedId = parseSignedGuestManageToken(token)
  if (signedId) {
    const { data, error } = await supabase
      .from('guest_alert_subscribers')
      .select(GUEST_SELECT)
      .eq('id', signedId)
      .maybeSingle()
    if (error) throw new Error(`Guest manage lookup failed: ${error.message}`)
    return data ? mapRow(data as GuestRow) : null
  }

  const { data, error } = await supabase
    .from('guest_alert_subscribers')
    .select(GUEST_SELECT)
    .eq('manage_token_hash', hashGuestToken(token))
    .maybeSingle()

  if (error) throw new Error(`Guest manage lookup failed: ${error.message}`)
  return data ? mapRow(data as GuestRow) : null
}

export async function updateGuestHazardPrefs(
  supabase: SupabaseClient<Database>,
  subscriberId: string,
  prefs: {
    notifyTornado: boolean
    notifySevereThunderstorm: boolean
    notifyFlashFlood: boolean
    notifyUpgrades: boolean
  },
): Promise<void> {
  const { error } = await supabase
    .from('guest_alert_subscribers')
    .update({
      notify_tornado: prefs.notifyTornado,
      notify_severe_thunderstorm: prefs.notifySevereThunderstorm,
      notify_flash_flood: prefs.notifyFlashFlood,
      notify_upgrades: prefs.notifyUpgrades,
      updated_at: new Date().toISOString(),
    } as never)
    .eq('id', subscriberId)
  if (error) throw new Error(`Guest pref update failed: ${error.message}`)
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
