import type { SupabaseClient } from '@supabase/supabase-js'
import { hazardPrefsFrom } from '@/lib/bitwatch/delivery-policy'
import type { Database } from '@/lib/supabase/types'

const SEVERE_KIND = 'severe_weather' as const

function locationLabel(row: {
  custom_name: string | null
  location_name: string
  city: string
  state: string | null
}): string {
  if (row.custom_name?.trim()) return row.custom_name.trim()
  if (row.location_name?.trim()) return row.location_name.trim()
  return row.state ? `${row.city}, ${row.state}` : row.city
}

/**
 * Align severe_weather subscriptions with notifications_enabled and saved locations.
 * Called when preferences toggle changes or a new location is saved.
 */
export async function syncSevereAlertSubscriptions(
  supabase: SupabaseClient<Database>,
  userId: string,
  notificationsEnabled: boolean,
): Promise<{ upserted: number; disabled: number }> {
  if (!notificationsEnabled) {
    const { data, error } = await supabase
      .from('alert_subscriptions')
      // @ts-expect-error - supabase-js Database generic mismatch
      .update({ enabled: false, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('kind', SEVERE_KIND)
      .select('id')

    if (error) {
      console.error('[severe-alert-subscriptions] disable failed', error)
      throw error
    }

    return { upserted: 0, disabled: data?.length ?? 0 }
  }

  const { data: locations, error: locError } = await supabase
    .from('saved_locations')
    .select('id')
    .eq('user_id', userId)

  if (locError) {
    console.error('[severe-alert-subscriptions] locations fetch failed', locError)
    throw locError
  }

  if (!locations?.length) {
    return { upserted: 0, disabled: 0 }
  }

  const now = new Date().toISOString()
  const rows = locations.map((loc) => ({
    user_id: userId,
    saved_location_id: (loc as { id: string }).id,
    kind: SEVERE_KIND,
    enabled: true,
    updated_at: now,
  }))

  const { data: upserted, error: upsertError } = await supabase
    .from('alert_subscriptions')
    // @ts-expect-error - supabase-js Database generic mismatch
    .upsert(rows, { onConflict: 'user_id,saved_location_id,kind' })
    .select('id')

  if (upsertError) {
    console.error('[severe-alert-subscriptions] upsert failed', upsertError)
    throw upsertError
  }

  return { upserted: upserted?.length ?? 0, disabled: 0 }
}

export async function fetchEnabledSevereSubscriptions(
  supabase: SupabaseClient<Database>,
): Promise<
  Array<{
    id: string
    user_id: string
    saved_location_id: string
    latitude: number
    longitude: number
    locationLabel: string
    notifyTornado: boolean
    notifySevereThunderstorm: boolean
    notifyFlashFlood: boolean
    notifyUpgrades: boolean
  }>
> {
  const { data, error } = await supabase
    .from('alert_subscriptions')
    .select(
      `
      id,
      user_id,
      saved_location_id,
      notify_tornado,
      notify_severe_thunderstorm,
      notify_flash_flood,
      notify_upgrades,
      saved_locations (
        latitude,
        longitude,
        location_name,
        custom_name,
        city,
        state
      )
    `,
    )
    .eq('kind', SEVERE_KIND)
    .eq('enabled', true)

  if (error) {
    console.error('[severe-alert-subscriptions] fetch enabled failed', error)
    return []
  }

  const rows: Array<{
    id: string
    user_id: string
    saved_location_id: string
    latitude: number
    longitude: number
    locationLabel: string
    notifyTornado: boolean
    notifySevereThunderstorm: boolean
    notifyFlashFlood: boolean
    notifyUpgrades: boolean
  }> = []

  for (const row of data ?? []) {
    const typed = row as {
      id: string
      user_id: string
      saved_location_id: string
      notify_tornado?: boolean | null
      notify_severe_thunderstorm?: boolean | null
      notify_flash_flood?: boolean | null
      notify_upgrades?: boolean | null
      saved_locations: {
        latitude: number
        longitude: number
        location_name: string
        custom_name: string | null
        city: string
        state: string | null
      } | null
    }
    const loc = typed.saved_locations

    if (!loc) continue

    rows.push({
      id: typed.id,
      user_id: typed.user_id,
      saved_location_id: typed.saved_location_id,
      latitude: loc.latitude,
      longitude: loc.longitude,
      locationLabel: locationLabel(loc),
      ...hazardPrefsFrom({
        notifyTornado: typed.notify_tornado,
        notifySevereThunderstorm: typed.notify_severe_thunderstorm,
        notifyFlashFlood: typed.notify_flash_flood,
        notifyUpgrades: typed.notify_upgrades,
      }),
    })
  }

  return rows
}

export { locationLabel }
