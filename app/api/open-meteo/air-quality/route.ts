/**
 * Raw Open-Meteo air-quality proxy for client adapters.
 * Enriched AQI shape: /api/weather/air-quality.
 */

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { withApiRoute } from '@/lib/api/with-api-route'
import { parseCoordinates } from '@/lib/api/query-params'
import { fetchOpenMeteoAirQuality } from '@/lib/open-meteo'

export async function GET(request: NextRequest) {
  return withApiRoute(request, async ({ request: req, rateLimitHeaders }) => {
    try {
      const sp = req.nextUrl.searchParams
      const coords = parseCoordinates(sp.get('lat'), sp.get('lon'))

      if (!coords.ok) {
        // Preserve prior missing-param wording for open-meteo clients/tests.
        const missing = !sp.get('lat') || !sp.get('lon')
        return NextResponse.json(
          {
            error: missing
              ? 'Missing required parameters: lat, lon'
              : coords.error === 'Coordinates out of valid range'
                ? 'Coordinates out of valid range'
                : 'Invalid coordinates provided',
          },
          { status: 400 },
        )
      }

      const data = await fetchOpenMeteoAirQuality(coords.latitude, coords.longitude)

      return NextResponse.json(data, {
        headers: {
          'Cache-Control': 'public, max-age=3600, s-maxage=3600',
          ...rateLimitHeaders,
        },
      })
    } catch (error) {
      console.error('[Open-Meteo Air Quality API] Error:', error)
      return NextResponse.json(
        { error: 'Air quality service unavailable' },
        { status: 502 },
      )
    }
  })
}
