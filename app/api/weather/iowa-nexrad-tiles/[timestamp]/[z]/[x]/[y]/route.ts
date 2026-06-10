import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server'
import { rateLimitRequest } from '@/lib/services/weather-rate-limiter'
import { tileProxyOriginHeaders } from '@/lib/services/tile-proxy-cors'

export const runtime = 'nodejs'

// Strict path-segment validation — these get interpolated into the upstream
// URL string at line below. Without these regexes, a path like
// `/iowa-nexrad-tiles/x?injected=val/0/0/0` would graft attacker-controlled
// query params onto the upstream request.
const TIMESTAMP_RE = /^\d{8}-\d{4}$/   // YYYYMMDD-HHMM
const ZOOM_RE = /^\d{1,2}$/             // 0..99 (Iowa caps at ~12)
const COORD_RE = /^\d+$/                // tile x or y, non-negative integer

// Proxy Iowa State RIDGE NEXRAD tile cache
// GET /api/weather/iowa-nexrad-tiles/{timestamp}/{z}/{x}/{y}.png
// timestamp format: YYYYMMDD-HHMM (e.g., 20251011-2050)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ timestamp: string; z: string; x: string; y: string }> }
) {
  const rateLimit = await rateLimitRequest(request)
  if (!rateLimit.allowed) return rateLimit.response

  const { timestamp, z, x, y } = await params

  // Validation 400s still need CORS headers — without them, allowed browser
  // clients see an opaque CORS failure instead of the real 400.
  if (!timestamp || !z || !x || !y) {
    return NextResponse.json({ error: 'Missing required parameters' }, { status: 400, headers: tileProxyOriginHeaders(request) })
  }

  if (!TIMESTAMP_RE.test(timestamp) || !ZOOM_RE.test(z) || !COORD_RE.test(x) || !COORD_RE.test(y)) {
    return NextResponse.json({ error: 'Invalid path parameter' }, { status: 400, headers: tileProxyOriginHeaders(request) })
  }

  // Iowa State TMS tile cache URL
  // For current/latest: nexrad-n0q (EPSG:3857 Web Mercator)
  // For historical with timestamp: nexrad-n0q-{timestamp}
  // timestamp format: YYYYMMDD-HHMM (UTC)

  // Try historical timestamp first, fallback to current if not available
  const iowaUrl = `https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/nexrad-n0q-${timestamp}/${z}/${x}/${y}.png`

  try {
    const response = await fetch(iowaUrl, {
      headers: {
        'User-Agent': '16-Bit-Weather/iowa-nexrad-tiles',
      },
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) {
      console.error(`[Iowa NEXRAD Tiles] Error ${response.status}: ${response.statusText}`)
      
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

    const imageBuffer = await response.arrayBuffer()

    // Parse timestamp to determine cache duration
    // Format: YYYYMMDD-HHMM
    let cacheControl = 'public, max-age=120, s-maxage=240'
    
    try {
      const year = parseInt(timestamp.substring(0, 4))
      const month = parseInt(timestamp.substring(4, 6)) - 1
      const day = parseInt(timestamp.substring(6, 8))
      const hour = parseInt(timestamp.substring(9, 11))
      const minute = parseInt(timestamp.substring(11, 13))
      
      const tileTime = new Date(Date.UTC(year, month, day, hour, minute)).getTime()
      const now = Date.now()
      const ageMinutes = (now - tileTime) / (1000 * 60)
      
      if (ageMinutes < 5) {
        // Very recent: short cache
        cacheControl = 'public, max-age=30, s-maxage=60, stale-while-revalidate=30'
      } else if (ageMinutes < 30) {
        // Recent: medium cache
        cacheControl = 'public, max-age=120, s-maxage=240, stale-while-revalidate=120'
      } else {
        // Older: long cache
        cacheControl = 'public, max-age=600, s-maxage=1200, stale-while-revalidate=600'
      }
    } catch (e) {
      // Use default caching if timestamp parsing fails
    }

    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': cacheControl,
        ...tileProxyOriginHeaders(request),
      },
    })
  } catch (error) {
    console.error('[Iowa NEXRAD Tiles] Fetch error:', error)
    
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

