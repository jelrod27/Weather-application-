/**
 * 16-Bit Weather Platform - WIS API Route
 *
 * Lightweight endpoint returning the current Weather Intensity Score.
 * Polled by the navbar WIS badge every 5 minutes.
 */

import { NextResponse } from 'next/server'
import { getWISScore } from '@/lib/services/nws-alerts-service'
import { logRouteError } from '@/lib/error-utils'

export async function GET() {
  try {
    const wis = await getWISScore()

    return NextResponse.json(wis, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
      },
    })
  } catch (error) {
    logRouteError('WIS API', error)
    return NextResponse.json(
      { error: 'Failed to fetch WIS score' },
      { status: 500 }
    )
  }
}
