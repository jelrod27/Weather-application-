import { NextRequest, NextResponse } from 'next/server'
import { rateLimitRequest } from '@/lib/services/weather-rate-limiter'
import { tileProxyOriginHeaders } from '@/lib/services/tile-proxy-cors'
import { parseRainViewerMapsPayload } from '@/lib/radar/rainviewer-types'

export const runtime = 'nodejs'

const RAINVIEWER_PUBLIC_API = 'https://api.rainviewer.com/public/weather-maps.json'

/** Proxy RainViewer metadata for international radar animation (CORS + cache). */
export async function GET(request: NextRequest) {
  try {
    const rateLimit = await rateLimitRequest(request)
    if (!rateLimit.allowed) return rateLimit.response

    const response = await fetch(RAINVIEWER_PUBLIC_API, {
      headers: { 'User-Agent': '16-Bit-Weather/rainviewer-maps-proxy' },
      signal: AbortSignal.timeout(10_000),
      next: { revalidate: 120 },
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: 'RainViewer metadata unavailable' },
        { status: 502, headers: tileProxyOriginHeaders(request) }
      )
    }

    const data: unknown = await response.json()
    const parsed = parseRainViewerMapsPayload(data)

    if (!parsed) {
      return NextResponse.json(
        { error: 'RainViewer metadata parse failed' },
        { status: 502, headers: tileProxyOriginHeaders(request) }
      )
    }

    return NextResponse.json(parsed, {
      headers: {
        'Cache-Control': 'public, max-age=120, s-maxage=120, stale-while-revalidate=60',
        ...tileProxyOriginHeaders(request),
      },
    })
  } catch (error) {
    console.error('[RainViewer maps proxy]', error)
    return NextResponse.json(
      { error: 'RainViewer metadata fetch failed' },
      { status: 502, headers: tileProxyOriginHeaders(request) }
    )
  }
}

export async function OPTIONS(request: NextRequest) {
  try {
    return new NextResponse(null, {
      status: 204,
      headers: {
        ...tileProxyOriginHeaders(request),
        'Access-Control-Max-Age': '86400',
      },
    })
  } catch (error) {
    console.error('[RainViewer maps proxy]', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: tileProxyOriginHeaders(request) }
    )
  }
}
