import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server'
import { tileProxyOriginHeaders } from '@/lib/services/tile-proxy-cors'
import { logRouteError } from '@/lib/error-utils'
import { withApiRoute } from '@/lib/api/with-api-route'

export const runtime = 'nodejs'

// Mirror the noaa-wms allow-list. Only forward known WMS params, drop anything
// else — keeps the request shape predictable and prevents an attacker from
// using this proxy to push exotic params at the upstream Iowa CGI script.
const ALLOWED_PARAMS = [
  'REQUEST', 'SERVICE', 'VERSION', 'LAYERS', 'WIDTH', 'HEIGHT',
  'CRS', 'SRS', 'BBOX', 'TIME', 'STYLES', 'FORMAT', 'TRANSPARENT',
] as const

// Proxy Iowa State NEXRAD WMS tiles to bypass CORS restrictions
// GET /api/weather/iowa-nexrad?REQUEST=GetMap&SERVICE=WMS&...
export async function GET(request: NextRequest) {
  return withApiRoute(request, async ({ rateLimitHeaders }) => {
    try {
      const { searchParams } = new URL(request.url)

      // Validate required WMS parameters
      const requiredParams = ['LAYERS', 'FORMAT']
      for (const param of requiredParams) {
        if (!searchParams.get(param)) {
          return NextResponse.json(
            { error: `Missing required parameter: ${param}` },
            { status: 400, headers: tileProxyOriginHeaders(request) }
          )
        }
      }

      // Build Iowa State NEXRAD WMS URL with allow-listed parameters only.
      const iowaBaseUrl = 'https://mesonet.agron.iastate.edu/cgi-bin/wms/nexrad/n0r.cgi'
      const iowaUrl = new URL(iowaBaseUrl)

      for (const key of ALLOWED_PARAMS) {
        const val = searchParams.get(key)
        if (val) iowaUrl.searchParams.set(key, val)
      }

      const response = await fetch(iowaUrl.toString(), {
        headers: {
          'User-Agent': '16-Bit-Weather/iowa-nexrad-proxy',
        },
        signal: AbortSignal.timeout(10000), // 10 second timeout for WMS requests
      })

      if (!response.ok) {
        console.error(`[Iowa NEXRAD Proxy] Error ${response.status}: ${response.statusText}`)
      
        // Return a transparent 1x1 PNG for failed requests
        const transparentPng = Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
          'base64'
        )
        return new NextResponse(transparentPng, {
          headers: {
            'Content-Type': 'image/png',
            'Cache-Control': 'public, max-age=60',
            ...tileProxyOriginHeaders(request),
          },
        })
      }

      const contentType = response.headers.get('content-type') || 'image/png'
      const imageBuffer = await response.arrayBuffer()

      // Adaptive caching based on TIME parameter
      const timeParam = searchParams.get('TIME')
      let cacheControl = 'public, max-age=120, s-maxage=240' // Default: 2 min / 4 min (shorter than NOAA)
    
      if (timeParam) {
        try {
          const tileTime = new Date(timeParam).getTime()
          const now = Date.now()
          const ageMinutes = (now - tileTime) / (1000 * 60)
        
          if (ageMinutes < 5) {
            // Very recent tiles: very short cache (data updating rapidly)
            cacheControl = 'public, max-age=30, s-maxage=60, stale-while-revalidate=30'
          } else if (ageMinutes < 30) {
            // Recent history: short cache
            cacheControl = 'public, max-age=120, s-maxage=240, stale-while-revalidate=120'
          } else {
            // Older tiles: longer cache
            cacheControl = 'public, max-age=600, s-maxage=1200, stale-while-revalidate=600'
          }
        } catch (e) {
          // Invalid time format, use default caching
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
      logRouteError('Iowa NEXRAD Proxy', error)
    
      // Return a transparent 1x1 PNG for errors
      const transparentPng = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        'base64'
      )
      return new NextResponse(transparentPng, {
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=30',
          ...tileProxyOriginHeaders(request),
        },
      })
    }
  }, { rateLimitBucket: 'tiles' })
}

// Handle OPTIONS requests for CORS preflight
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      ...tileProxyOriginHeaders(request),
      'Access-Control-Max-Age': '86400',
    },
  })
}

