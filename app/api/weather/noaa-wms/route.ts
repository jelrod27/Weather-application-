import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server'
import { tileProxyOriginHeaders } from '@/lib/services/tile-proxy-cors'
import { logRouteError } from '@/lib/error-utils'
import { withApiRoute } from '@/lib/api/with-api-route'

export const runtime = 'nodejs'

// Proxy NOAA MRMS WMS tiles to bypass CORS restrictions
// GET /api/weather/noaa-wms?REQUEST=GetMap&SERVICE=WMS&...
export async function GET(request: NextRequest) {
  return withApiRoute(request, async () => {
    try {
      const { searchParams } = new URL(request.url)
    
      // Validate required WMS parameters
      const requiredParams = ['REQUEST', 'SERVICE', 'VERSION', 'LAYERS', 'WIDTH', 'HEIGHT', 'CRS', 'BBOX']
      for (const param of requiredParams) {
        if (!searchParams.get(param)) {
          return NextResponse.json(
            { error: `Missing required parameter: ${param}` },
            { status: 400, headers: tileProxyOriginHeaders(request) }
          )
        }
      }

      // Build NOAA WMS URL with all parameters
      const noaaBaseUrl = 'https://nowcoast.noaa.gov/arcgis/services/nowcoast/radar_meteo_imagery_nexrad_time/MapServer/WMSServer'
      const noaaUrl = new URL(noaaBaseUrl)
    
      // Whitelist allowed WMS parameters — do not forward arbitrary params
      const ALLOWED_PARAMS = ['REQUEST', 'SERVICE', 'VERSION', 'LAYERS', 'WIDTH', 'HEIGHT', 'CRS', 'BBOX', 'TIME', 'STYLES', 'FORMAT']
      for (const key of ALLOWED_PARAMS) {
        const val = searchParams.get(key)
        if (val) noaaUrl.searchParams.set(key, val)
      }

      const response = await fetch(noaaUrl.toString(), {
        headers: {
          'User-Agent': '16-Bit-Weather/noaa-wms-proxy',
        },
        signal: AbortSignal.timeout(10000), // 10 second timeout for WMS requests
      })

      if (!response.ok) {
        console.error(`[NOAA WMS Proxy] Error ${response.status}: ${response.statusText}`)
      
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
      let cacheControl = 'public, max-age=300, s-maxage=600' // Default: 5 min / 10 min
    
      if (timeParam) {
        try {
          const tileTime = new Date(timeParam).getTime()
          const now = Date.now()
          const ageMinutes = (now - tileTime) / (1000 * 60)
        
          if (ageMinutes < 10) {
            // Recent tiles: shorter cache (data still updating)
            cacheControl = 'public, max-age=60, s-maxage=120, stale-while-revalidate=60'
          } else if (ageMinutes < 60) {
            // Recent history: medium cache
            cacheControl = 'public, max-age=300, s-maxage=600, stale-while-revalidate=300'
          } else {
            // Older tiles: longer cache (data unlikely to change)
            cacheControl = 'public, max-age=1800, s-maxage=3600, stale-while-revalidate=1800'
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
      logRouteError('NOAA WMS Proxy', error)
    
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
  })
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

