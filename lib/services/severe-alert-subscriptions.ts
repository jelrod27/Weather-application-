import type { SupabaseClient } from '@supabase/supabase-js'
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
      .update({ enabled: false, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('kind', SEVERE_KIND)
      .select('id')

    if (error) {
      console.error('[severe-alert-subscriptions] disable failed', error.message)
      throw error
    }

    return { upserted: 0, disabled: data?.length ?? 0 }
  }

  const { data: locations, error: locError } = await supabase
    .from('saved_locations')
    .select('id')
    .eq('user_id', userId)

  if (locError) {
    console.error('[severe-alert-subscriptions] locations fetch failed', locError.message)
    throw locError
  }

  if (!locations?.length) {
    return { upserted: 0, disabled: 0 }
  }

  const now = new Date().toISOString()
  const rows = locations.map((loc) => ({
    user_id: userId,
    saved_location_id: loc.id,
    kind: SEVERE_KIND,
    enabled: true,
    updated_at: now,
  }))

  const { data: upserted, error: upsertError } = await supabase
    .from('alert_subscriptions')
    .upsert(rows, { onConflict: 'user_id,saved_location_id,kind' })
    .select('id')

  if (upsertError) {
    console.error('[severe-alert-subscriptions] upsert failed', upsertError.message)
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
  }>
> {
  const { data, error } = await supabase
    .from('alert_subscriptions')
    .select(
      `
      id,
      user_id,
      saved_location_id,
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
    throw new Error(`Failed to load subscriptions: ${error.message}`)
  }

  const rows: Array<{
    id: string
    user_id: string
    saved_location_id: string
    latitude: number
    longitude: number
    locationLabel: string
  }> = []

  for (const row of data ?? []) {
    const loc = row.saved_locations as {
      latitude: number
      longitude: number
      location_name: string
      custom_name: string | null
      city: string
      state: string | null
    } | null

    if (!loc) continue

    rows.push({
      id: row.id,
      user_id: row.user_id,
      saved_location_id: row.saved_location_id,
      latitude: loc.latitude,
      longitude: loc.longitude,
      locationLabel: locationLabel(loc),
    })
  }

  return rows
}

export { locationLabel }
