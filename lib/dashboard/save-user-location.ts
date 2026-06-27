export interface SaveUserLocationInput {
  location_name: string
  city: string
  state?: string | null
  country: string
  latitude: number
  longitude: number
  is_favorite?: boolean
  custom_name?: string | null
  notes?: string | null
}

export async function saveUserLocation(input: SaveUserLocationInput): Promise<void> {
  const { supabase } = await import('@/lib/supabase/client')
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()

  if (sessionError || !session) {
    throw new Error('You must be logged in to save locations')
  }

  const response = await fetch('/api/locations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      ...input,
      is_favorite: input.is_favorite ?? false,
      custom_name: input.custom_name ?? null,
      notes: input.notes ?? null,
    }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    if (response.status === 409 && errorData.existing) {
      throw new Error('This location is already in your saved locations.')
    }
    throw new Error(errorData.error || 'Failed to save location')
  }
}
