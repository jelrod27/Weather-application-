import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@supabase/supabase-js'
import { captureError, captureDbError } from '@/lib/error-utils'
import { tryEnableSevereAlertsForUser } from '@/lib/services/severe-alert-subscription-sync'
import { withApiRoute } from '@/lib/api/with-api-route'
import { supabaseTimedFetch } from '@/lib/supabase/timed-fetch'

// Reject blank/whitespace coordinates instead of coercing them to 0. Plain
// z.coerce.number() runs Number(...), which turns '', '   ', null, and false
// into 0 — those would pass the range checks and silently persist as (0, 0).
// Treat blank strings as missing so they fail validation.
const coordinate = (min: number, max: number) =>
  z.preprocess((value) => {
    if (typeof value === 'string') {
      const trimmed = value.trim()
      return trimmed === '' ? undefined : Number(trimmed)
    }
    return value
  }, z.number().min(min).max(max))

// Bound every free-text field so a client can't bloat the DB with oversized
// payloads, and range-check coordinates (replaces the old manual parseFloat
// guards). Unknown keys (e.g. a client-sent user_id) are stripped by Zod.
const savedLocationSchema = z.object({
  location_name: z.string().trim().min(1).max(120),
  city: z.string().trim().min(1).max(120),
  state: z.string().trim().max(120).nullish(),
  country: z.string().trim().min(1).max(80),
  latitude: coordinate(-90, 90),
  longitude: coordinate(-180, 180),
  is_favorite: z.boolean().optional().default(false),
  custom_name: z.string().trim().max(120).nullish(),
  notes: z.string().trim().max(2000).nullish(),
})

export async function POST(request: NextRequest) {
  return withApiRoute(request, async ({ rateLimitHeaders }) => {
    try {
      let rawBody: unknown
      try {
        rawBody = await request.json()
      } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
      }

      const parsed = savedLocationSchema.safeParse(rawBody)
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Invalid location data', details: parsed.error.flatten().fieldErrors },
          { status: 400 }
        )
      }
      const v = parsed.data

      // Get auth header from request
      const authHeader = request.headers.get('authorization')

      if (!authHeader) {
        return NextResponse.json(
          { error: 'Authorization required' },
          { status: 401 }
        )
      }

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

      // Auth-scoped client: verifies the JWT and enforces RLS
      const authClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: {
          fetch: supabaseTimedFetch,
          headers: {
            Authorization: authHeader
          }
        },
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      })

      const { data: { user }, error: authError } = await authClient.auth.getUser()

      if (authError || !user) {
        if (authError) captureError(authError, 'locations.POST.auth')
        return NextResponse.json(
          { error: 'Invalid authentication' },
          { status: 401 }
        )
      }

      // Derive user_id from the verified session — never trust the client
      const verifiedUserId = user.id

      // Use the auth-scoped client so RLS enforces ownership end-to-end
      const locationData = {
        user_id: verifiedUserId,
        location_name: v.location_name,
        city: v.city,
        state: v.state ?? null,
        country: v.country,
        latitude: v.latitude,
        longitude: v.longitude,
        is_favorite: v.is_favorite,
        custom_name: v.custom_name ?? null,
        notes: v.notes ?? null,
      }

      // Check if location already exists for this user
      const { data: existingLocations, error: checkError } = await authClient
        .from('saved_locations')
        .select('id')
        .eq('user_id', verifiedUserId)
        .eq('latitude', locationData.latitude)
        .eq('longitude', locationData.longitude)
        .limit(1)

      if (checkError) {
        captureDbError('locations.checkExisting', checkError, { user_id: verifiedUserId })
        return NextResponse.json(
          { error: 'Failed to verify location' },
          { status: 500 }
        )
      }

      if (existingLocations && existingLocations.length > 0) {
        return NextResponse.json(
          { error: 'This location is already saved', existing: true },
          { status: 409 }
        )
      }

      // Insert the location (RLS enforces user_id = auth.uid())
      const { data, error } = await authClient
        .from('saved_locations')
        .insert(locationData)
        .select()
        .single()

      if (error) {
        captureDbError('locations.insert', error, { user_id: verifiedUserId })

        if (error.code === '42501') {
          return NextResponse.json(
            { error: 'Permission denied' },
            { status: 403 }
          )
        }

        return NextResponse.json(
          { error: 'Failed to save location' },
          { status: 500 }
        )
      }

      await tryEnableSevereAlertsForUser(verifiedUserId)

      return NextResponse.json(data)

    } catch (error) {
      captureError(error, 'locations.POST')
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  })
}

export async function GET(request: NextRequest) {
  return withApiRoute(request, async ({ rateLimitHeaders }) => {
    try {
      // Get auth header from request
      const authHeader = request.headers.get('authorization')

      if (!authHeader) {
        return NextResponse.json(
          { error: 'Authorization required' },
          { status: 401 }
        )
      }

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

      const authClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: {
          fetch: supabaseTimedFetch,
          headers: {
            Authorization: authHeader
          }
        },
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      })

      const { data: { user }, error: authError } = await authClient.auth.getUser()

      if (authError || !user) {
        if (authError) captureError(authError, 'locations.GET.auth')
        return NextResponse.json(
          { error: 'Invalid authentication' },
          { status: 401 }
        )
      }

      // RLS enforces user_id = auth.uid() — no service-role needed
      const { data, error } = await authClient
        .from('saved_locations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        captureDbError('locations.fetch', error, { userId: user.id })
        return NextResponse.json(
          { error: 'Failed to fetch locations' },
          { status: 500 }
        )
      }

      // Transform the data to match expected format (column names are now correct)
      const transformedData = (data || []).map((location: Record<string, unknown>) => ({
        ...location,
        // Ensure backwards compatibility - prefer correct column names
        location_name: location.location_name || location.city_name,
        custom_name: location.custom_name || location.nickname,
        notes: location.notes || null,
        updated_at: location.updated_at || location.created_at
      }))

      return NextResponse.json(transformedData)

    } catch (error) {
      captureError(error, 'locations.GET')
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  })
}