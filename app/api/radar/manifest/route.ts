import { NextResponse } from 'next/server'
import { fetchRainViewerManifest } from '@/lib/radar/rainviewer'
import { logRouteError } from '@/lib/error-utils'

export async function GET() {
  try {
    const manifest = await fetchRainViewerManifest()

    return NextResponse.json(manifest, {
      headers: {
        'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=60',
      },
    })
  } catch (error) {
    logRouteError('radar-manifest', error)
    return NextResponse.json(
      { error: 'Failed to fetch RainViewer manifest' },
      { status: 502 },
    )
  }
}
