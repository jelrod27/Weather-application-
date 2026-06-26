import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { buildRadarMetadata } from '@/lib/radar'

function parseCoordinate(value: string | null): number | null {
  if (value == null || value.trim() === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export async function GET(request: NextRequest) {
  try {
    const lat = parseCoordinate(request.nextUrl.searchParams.get('lat'))
    const lon = parseCoordinate(request.nextUrl.searchParams.get('lon'))

    if (lat == null || lon == null) {
      return NextResponse.json(
        { error: 'Missing required parameters: lat, lon' },
        { status: 400 }
      )
    }

    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      return NextResponse.json(
        { error: 'Coordinates out of valid range' },
        { status: 400 }
      )
    }

    const metadata = await buildRadarMetadata(lat, lon)

    return NextResponse.json(metadata, {
      headers: {
        'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=60',
      },
    })
  } catch (error) {
    console.error('[radar-metadata]', error)
    return NextResponse.json(
      { error: 'Failed to build radar metadata' },
      { status: 500 }
    )
  }
}
