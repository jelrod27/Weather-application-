import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { fetchRainViewerManifest } from '@/lib/radar/rainviewer'
import { logRouteError } from '@/lib/error-utils'
import { withApiRoute } from '@/lib/api/with-api-route'

export async function GET(request: NextRequest) {
  return withApiRoute(request, async ({ rateLimitHeaders }) => {
  try {
    const manifest = await fetchRainViewerManifest()

    return NextResponse.json(manifest, {
      headers: {
        'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=60',
        ...rateLimitHeaders,
      },
    })
  } catch (error) {
    logRouteError('radar-manifest', error)
    return NextResponse.json(
      { error: 'Failed to fetch RainViewer manifest' },
      { status: 502 },
    )
  }
  }, { context: 'radar-manifest' })
}
