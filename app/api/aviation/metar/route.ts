/**
 * METAR API route — thin wrapper over lib/aviation/metar + NOAA AWC fetch.
 */

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { fetchWithTimeout } from '@/lib/fetch-with-timeout'
import { rateLimitRequest } from '@/lib/services/weather-rate-limiter'
import {
  toMetarObservation,
  type MetarResponse,
} from '@/lib/aviation/metar'

// Re-export domain types for any leftover route-path imports.
export type { MetarObservation, MetarResponse } from '@/lib/aviation/metar'

const metarCache = new Map<string, { data: MetarResponse; expires: number }>()
const CACHE_TTL_MS = 10 * 60 * 1000

export async function GET(request: NextRequest) {
  try {
    const rateLimit = await rateLimitRequest(request)
    if (!rateLimit.allowed) {
      return rateLimit.response
    }

    const sp = request.nextUrl.searchParams
    const station = sp.get('station')?.toUpperCase()

    if (!station) {
      return NextResponse.json(
        { error: 'Missing required parameter: station (ICAO code)' },
        { status: 400 },
      )
    }

    if (!/^[A-Z]{4}$/.test(station)) {
      return NextResponse.json(
        { error: 'Invalid station format. Must be 4-letter ICAO code (e.g., KJFK)' },
        { status: 400 },
      )
    }

    const cached = metarCache.get(station)
    if (cached && cached.expires > Date.now()) {
      return NextResponse.json(cached.data, {
        headers: {
          'X-Cache': 'HIT',
          'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1200',
        },
      })
    }

    const url = `https://aviationweather.gov/api/data/metar?ids=${station}&format=raw&taf=false`

    const response = await fetchWithTimeout(url, {
      headers: {
        Accept: 'text/plain',
        'User-Agent': '16-Bit-Weather/1.0',
      },
      cache: 'no-store',
      signal: request.signal,
    })

    if (!response.ok) {
      console.error(`[METAR API] AWC returned ${response.status} for ${station}`)
      return NextResponse.json(
        {
          station,
          error: 'Unable to fetch METAR data',
          timestamp: new Date().toISOString(),
        },
        { status: 502 },
      )
    }

    const rawText = await response.text()

    if (!rawText || rawText.trim().length === 0) {
      return NextResponse.json(
        {
          station,
          error: 'No METAR data available for this station',
          timestamp: new Date().toISOString(),
        },
        { status: 404 },
      )
    }

    const result: MetarResponse = {
      station,
      observation: toMetarObservation(rawText, station),
      timestamp: new Date().toISOString(),
    }

    metarCache.set(station, {
      data: result,
      expires: Date.now() + CACHE_TTL_MS,
    })

    const now = Date.now()
    for (const [key, value] of Array.from(metarCache.entries())) {
      if (value.expires < now) {
        metarCache.delete(key)
      }
    }

    return NextResponse.json(result, {
      headers: {
        'X-Cache': 'MISS',
        'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1200',
      },
    })
  } catch (error) {
    console.error('[METAR API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch METAR data' },
      { status: 500 },
    )
  }
}
