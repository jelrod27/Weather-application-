/**
 * 16-Bit Weather Platform - Pollen API
 *
 * Prefer Google Pollen when GOOGLE_POLLEN_API_KEY is set (US coverage).
 * Otherwise use Open-Meteo CAMS pollen (Europe). Never require OpenWeather.
 */

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { fetchPollenForLocation, UNAVAILABLE_POLLEN_BODY } from '@/lib/pollen/fetch-pollen'
import { logRouteError } from '@/lib/error-utils'
import { withApiRoute } from '@/lib/api/with-api-route'

export async function GET(request: NextRequest) {
  return withApiRoute(request, async ({ rateLimitHeaders }) => {
    try {
      const searchParams = request.nextUrl.searchParams
      const lat = searchParams.get('lat')
      const lon = searchParams.get('lon')

      if (!lat || !lon) {
        return NextResponse.json(
          { error: 'Missing required parameters: lat, lon' },
          { status: 400 },
        )
      }

      const latitude = Number(lat.trim())
      const longitude = Number(lon.trim())

      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return NextResponse.json(
          { error: 'Invalid coordinates provided' },
          { status: 400 },
        )
      }

      if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
        return NextResponse.json(
          { error: 'Coordinates out of valid range' },
          { status: 400 },
        )
      }

      const pollen = await fetchPollenForLocation(latitude, longitude, {
        signal: request.signal,
      })

      if (pollen.source === 'unavailable') {
        return NextResponse.json(UNAVAILABLE_POLLEN_BODY, {
          status: 200,
          headers: rateLimitHeaders,
        })
      }

      return NextResponse.json(pollen, {
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=600',
          ...rateLimitHeaders,
        },
      })
    } catch (error) {
      logRouteError('pollen', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  })
}
