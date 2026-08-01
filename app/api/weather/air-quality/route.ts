/**
 * Air Quality API — enriched AQI response for dashboard cards.
 * Raw Open-Meteo payload lives at /api/open-meteo/air-quality.
 */

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { withApiRoute } from '@/lib/api/with-api-route'
import { parseCoordinates } from '@/lib/api/query-params'
import { fetchOpenMeteoAirQuality } from '@/lib/open-meteo'
import { logRouteError } from '@/lib/error-utils'

const CACHE_DURATION = 3600

function getAQICategory(aqi: number): string {
  if (aqi <= 50) return 'Good'
  if (aqi <= 100) return 'Moderate'
  if (aqi <= 150) return 'Unhealthy for Sensitive Groups'
  if (aqi <= 200) return 'Unhealthy'
  if (aqi <= 300) return 'Very Unhealthy'
  return 'Hazardous'
}

export async function GET(request: NextRequest) {
  return withApiRoute(request, async ({ request: req, rateLimitHeaders }) => {
    try {
      const searchParams = req.nextUrl.searchParams
      const coords = parseCoordinates(searchParams.get('lat'), searchParams.get('lon'))

      if (!coords.ok) {
        return NextResponse.json(
          {
            error: coords.error,
            aqi: 0,
            category: 'No Data',
            source: 'error',
          },
          { status: 400 },
        )
      }

      const { latitude, longitude } = coords
      const data = await fetchOpenMeteoAirQuality(latitude, longitude)
      const current = data.current

      if (current.us_aqi == null) {
        console.error('[air-quality] Open-Meteo returned no us_aqi value')
        return NextResponse.json(
          { error: 'Upstream air quality data incomplete' },
          { status: 502 },
        )
      }

      const aqiValue = current.us_aqi

      return NextResponse.json(
        {
          aqi: aqiValue,
          category: getAQICategory(aqiValue),
          source: 'open-meteo',
          pollutants: {
            pm2_5: current.pm2_5,
            pm10: current.pm10,
            ozone: current.ozone,
            nitrogen_dioxide: current.nitrogen_dioxide,
            sulphur_dioxide: current.sulphur_dioxide,
            carbon_monoxide: current.carbon_monoxide,
          },
          debug: {
            timestamp: new Date().toISOString(),
            dust: current.dust,
            uv_index: current.uv_index,
          },
        },
        {
          status: 200,
          headers: {
            'Cache-Control': `public, s-maxage=${CACHE_DURATION}, stale-while-revalidate`,
            'X-AQI-Source': 'open-meteo',
            ...rateLimitHeaders,
          },
        },
      )
    } catch (error: unknown) {
      logRouteError('air-quality', error)
      return NextResponse.json(
        { error: 'Air quality service temporarily unavailable' },
        { status: 502 },
      )
    }
  })
}
