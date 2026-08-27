/**
 * 16-Bit Weather Platform - WIS API Route
 *
 * Lightweight endpoint returning the current Weather Intensity Score.
 * Polled by the navbar WIS badge every 5 minutes.
 */

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { getWISScore } from '@/lib/services/nws-alerts-service'
import { logRouteError } from '@/lib/error-utils'
import { withApiRoute } from '@/lib/api/with-api-route'

export async function GET(request: NextRequest) {
  return withApiRoute(request, async ({ rateLimitHeaders }) => {
  try {
    const wis = await getWISScore()

    return NextResponse.json(wis, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
        ...rateLimitHeaders,
      },
    })
  } catch (error) {
    logRouteError('WIS API', error)
    return NextResponse.json(
      { error: 'Failed to fetch WIS score' },
      { status: 500 }
    )
  }
  }, { context: 'WIS API' })
}
