import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server'
import { rateLimitRequest } from '@/lib/services/weather-rate-limiter'
import { tileProxyOriginHeaders } from '@/lib/services/tile-proxy-cors'

export const runtime = 'nodejs'

// Proxy OpenWeather map tiles with optional time parameter
// GET /api/weather/radar/{layer}/{time?}/{z}/{x}/{y}
// Examples:
// /api/weather/radar/precipitation_new/10/163/395/598
// /api/weather/radar/precipitation_new/163/395/598  (no time)

const LAYER_MAP: Record<string, string> = {
  // precipitation_new removed - use NOAA MRMS via WMS instead
  // OpenWeather free tier doesn't support time-series animation
  clouds_new: 'clouds_new',
  wind_new: 'wind_new',
  pressure_new: 'pressure_new',
  temp_new: 'temp_new',
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ layer: string; tile: string[] }> }
) {
  // Single try wraps the whole handler — any throw from rateLimitRequest,
  // params await, layer validation, URL construction, or the fetch becomes
  // a transparent-PNG fallback instead of an unhandled 500.
  let mapped: string | undefined
  let path: string | undefined
  try {
    const rateLimit = await rateLimitRequest(request)
    if (!rateLimit.allowed) return rateLimit.response

    const { layer, tile } = await params
    const apiKey = process.env.OPENWEATHER_API_KEY
    if (!apiKey) {
      console.error('[Radar Proxy] OPENWEATHER_API_KEY is not configured')
      return NextResponse.json({ error: 'API key not configured' }, { status: 500, headers: tileProxyOriginHeaders(request) })
    }

    // Early return for unsupported precipitation layer
    if (layer === 'precipitation_new') {
      return new NextResponse(
        JSON.stringify({
          error: 'precipitation_new removed - use NOAA MRMS via WMS',
          message: 'OpenWeather radar replaced with NOAA MRMS for higher quality'
        }),
        {
          status: 410, // 410 Gone - resource permanently removed
          headers: { 'Content-Type': 'application/json', ...tileProxyOriginHeaders(request) }
        }
      )
    }

    mapped = LAYER_MAP[layer]
    if (!mapped) {
      return NextResponse.json({ error: 'Unsupported layer' }, { status: 400, headers: tileProxyOriginHeaders(request) })
    }

    // tile may be [time, z, x, y] or [z, x, y]
    let time: string | undefined
    let z: string, x: string, y: string
    if (tile.length === 4) {
      ;[time, z, x, y] = tile
    } else if (tile.length === 3) {
      ;[z, x, y] = tile as [string, string, string]
    } else {
      return NextResponse.json({ error: 'Invalid tile path' }, { status: 400, headers: tileProxyOriginHeaders(request) })
    }

    const base = 'https://tile.openweathermap.org/map'
    path = time
      ? `${mapped}/${time}/${z}/${x}/${y}.png`
      : `${mapped}/${z}/${x}/${y}.png`
    const url = `${base}/${path}?appid=${apiKey}`

    const response = await fetch(url, {
      headers: { 'User-Agent': '16-Bit-Weather/radar-proxy' },
      // Timeouts via AbortSignal timeout; keep short for "now" tiles
      signal: AbortSignal.timeout(8000)
    })

    if (!response.ok) {
      if (response.status === 401) {
        console.error('Radar proxy 401 Unauthorized', { layer: mapped, path })
        return NextResponse.json({ error: 'Invalid API key' }, { status: 401, headers: tileProxyOriginHeaders(request) })
      }
      if (response.status === 429) {
        console.warn('Radar proxy 429 Rate limited', { layer: mapped, path })
        return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429, headers: tileProxyOriginHeaders(request) })
      }
      // transparent 1x1 png
      const transparentPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64')
      return new NextResponse(transparentPng, {
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=60',
        },
      })
    }

    const buf = await response.arrayBuffer()
    // Adaptive caching: short TTL for now-frame, longer for past frames
    const isNowFrame = !time || Math.abs(Date.now() - Number(time)) < 15 * 60 * 1000
    const headers = new Headers({
      'Content-Type': 'image/png',
      'Cache-Control': isNowFrame
        ? 'public, max-age=60, s-maxage=60, stale-while-revalidate=60'
        : 'public, max-age=1800, s-maxage=3600, stale-while-revalidate=1800',
      ...tileProxyOriginHeaders(request),
    })
    return new NextResponse(buf, { headers })
  } catch (e) {
    // mapped/path may be undefined if the throw happened before they were
    // assigned (e.g. rateLimit failure, params-await error). That's fine —
    // the log just loses some context, the user still gets a transparent
    // PNG instead of a 500.
    console.error('Radar proxy error', { layer: mapped ?? null, path: path ?? null, error: String(e) })
    const transparentPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64')
    return new NextResponse(transparentPng, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=30',
      },
    })
  }
}
