/**
 * Geocoding API route — thin wrapper over lib/geocoding/lookup.
 */

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { withApiRoute } from '@/lib/api/with-api-route'
import { logRouteError } from '@/lib/error-utils'
import {
  lookupGeocodingZip,
  resolveGeocodingQuery,
  reverseGeocodingLookup,
} from '@/lib/geocoding/lookup'

export async function GET(request: NextRequest) {
  return withApiRoute(request, async ({ request: req, rateLimitHeaders }) => {
    try {
      const searchParams = req.nextUrl.searchParams
      const q = searchParams.get('q')
      const zip = searchParams.get('zip')
      const lat = searchParams.get('lat')
      const lon = searchParams.get('lon')
      const limitRaw = searchParams.get('limit') || '1'

      if (!q && !zip && !(lat && lon)) {
        return NextResponse.json(
          { error: 'Missing required parameter: q (location query), zip (ZIP code), or lat/lon' },
          { status: 400 },
        )
      }

      if (lat && lon) {
        const latNum = Number(lat)
        const lonNum = Number(lon)
        if (Number.isNaN(latNum) || Number.isNaN(lonNum)) {
          return NextResponse.json(
            { error: 'Latitude and longitude must be valid numbers' },
            { status: 400 },
          )
        }

        try {
          const results = await reverseGeocodingLookup(latNum, lonNum)
          if (results.length === 0) {
            return NextResponse.json({ error: 'Location not found' }, { status: 404 })
          }
          return NextResponse.json(results, { headers: rateLimitHeaders })
        } catch (err) {
          logRouteError('weather/geocoding', err, { mode: 'reverse' })
          return NextResponse.json({ error: 'Reverse geocoding failed' }, { status: 502 })
        }
      }

      if (zip) {
        try {
          const result = await lookupGeocodingZip(zip)
          if (!result) {
            return NextResponse.json({ error: 'ZIP code not found' }, { status: 404 })
          }
          return NextResponse.json(result, { headers: rateLimitHeaders })
        } catch (err) {
          logRouteError('weather/geocoding', err, { mode: 'zip' })
          return NextResponse.json({ error: 'ZIP lookup failed' }, { status: 502 })
        }
      }

      const limit = parseInt(limitRaw, 10)
      if (isNaN(limit) || limit < 1 || limit > 5) {
        return NextResponse.json(
          { error: 'Limit must be a number between 1 and 5' },
          { status: 400 },
        )
      }

      if (/^-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?$/.test(q!.trim())) {
        return NextResponse.json(
          { error: 'Coordinates must be supplied via lat/lon parameters, not q' },
          { status: 400 },
        )
      }

      try {
        const results = await resolveGeocodingQuery(q!, limit)
        if (results.length === 0) {
          return NextResponse.json({ error: 'Location not found' }, { status: 404 })
        }
        return NextResponse.json(results, { headers: rateLimitHeaders })
      } catch (err) {
        logRouteError('weather/geocoding', err, { mode: 'direct' })
        return NextResponse.json({ error: 'Geocoding service unavailable' }, { status: 502 })
      }
    } catch (error) {
      logRouteError('weather/geocoding', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  })
}
