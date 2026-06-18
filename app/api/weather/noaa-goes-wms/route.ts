import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { rateLimitRequest } from '@/lib/services/weather-rate-limiter'
import { tileProxyOriginHeaders } from '@/lib/services/tile-proxy-cors'
import { GOES_IR_WMS_LAYER } from '@/lib/radar/goes-satellite'

export const runtime = 'nodejs'

const GOES_WMS_BASE_URL =
  'https://nowcoast.noaa.gov/arcgis/services/nowcoast/sat_meteo_imagery_time/MapServer/WMSServer'

const ALLOWED_PARAMS = [
  'REQUEST',
  'SERVICE',
  'VERSION',
  'LAYERS',
  'WIDTH',
  'HEIGHT',
  'CRS',
  'BBOX',
  'TIME',
  'STYLES',
  'FORMAT',
] as const

const TRANSPARENT_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
)

function transparentTileResponse(request: NextRequest, cacheControl = 'public, max-age=60') {
  return new NextResponse(TRANSPARENT_PNG, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': cacheControl,
      ...tileProxyOriginHeaders(request),
    },
  })
}

export async function GET(request: NextRequest) {
  try {
    const rateLimit = await rateLimitRequest(request)
    if (!rateLimit.allowed) return rateLimit.response

    const { searchParams } = new URL(request.url)
    const requiredParams = ['REQUEST', 'SERVICE', 'VERSION', 'LAYERS', 'WIDTH', 'HEIGHT', 'CRS', 'BBOX']
    for (const param of requiredParams) {
      if (!searchParams.get(param)) {
        return NextResponse.json(
          { error: `Missing required parameter: ${param}` },
          { status: 400, headers: tileProxyOriginHeaders(request) },
        )
      }
    }

    const layer = searchParams.get('LAYERS')
    if (layer !== GOES_IR_WMS_LAYER) {
      return NextResponse.json(
        { error: 'Unsupported GOES layer' },
        { status: 400, headers: tileProxyOriginHeaders(request) },
      )
    }

    const goesUrl = new URL(GOES_WMS_BASE_URL)
    for (const key of ALLOWED_PARAMS) {
      const val = searchParams.get(key)
      if (val) goesUrl.searchParams.set(key, val)
    }

    const response = await fetch(goesUrl.toString(), {
      headers: {
        'User-Agent': '16-Bit-Weather/noaa-goes-wms-proxy',
      },
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) {
      console.error(`[NOAA GOES WMS Proxy] Error ${response.status}: ${response.statusText}`)
      return transparentTileResponse(request)
    }

    const contentType = response.headers.get('content-type') || 'image/png'
    const imageBuffer = await response.arrayBuffer()
    const timeParam = searchParams.get('TIME')
    let cacheControl = 'public, max-age=300, s-maxage=600'

    if (timeParam) {
      try {
        const tileTime = new Date(timeParam).getTime()
        const ageMinutes = (Date.now() - tileTime) / (1000 * 60)
        if (ageMinutes < 15) {
          cacheControl = 'public, max-age=120, s-maxage=300, stale-while-revalidate=120'
        } else if (ageMinutes < 120) {
          cacheControl = 'public, max-age=900, s-maxage=1800, stale-while-revalidate=900'
        } else {
          cacheControl = 'public, max-age=3600, s-maxage=7200, stale-while-revalidate=3600'
        }
      } catch {
        // keep default cache
      }
    }

    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': cacheControl,
        ...tileProxyOriginHeaders(request),
      },
    })
  } catch (error) {
    console.error('[NOAA GOES WMS Proxy] Fetch error:', error)
    return transparentTileResponse(request, 'public, max-age=30')
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      ...tileProxyOriginHeaders(request),
      'Access-Control-Max-Age': '86400',
    },
  })
}
