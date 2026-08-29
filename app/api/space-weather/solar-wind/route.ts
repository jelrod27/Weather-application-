/**
 * Solar Wind API — current + trend from NOAA SWPC RTSW feeds.
 */

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import {
  fetchRtswFeeds,
  parseRtswSolarWind,
  type SolarWindCurrent,
} from '@/lib/services/swpc-solar-wind'
import { logRouteError } from '@/lib/error-utils'
import { withApiRoute } from '@/lib/api/with-api-route'

export interface SolarWindData {
  timestamp: string
  current: SolarWindCurrent
  trend: 'increasing' | 'decreasing' | 'stable'
  recent: Array<{
    timeTag: string
    speed: number
    density: number
    bz: number
  }>
}

export async function GET(request: NextRequest) {
  return withApiRoute(request, async ({ rateLimitHeaders }) => {
  try {
    const { windJson, magJson } = await fetchRtswFeeds({
      headers: { Accept: 'application/json' },
      next: { revalidate: 60 },
    })

    const parsed = parseRtswSolarWind(windJson, magJson)

    const result: SolarWindData = {
      timestamp: new Date().toISOString(),
      current: parsed.current,
      trend: parsed.trend,
      recent: parsed.recent,
    }

    if (!parsed.available) {
      return NextResponse.json(
        {
          data: result,
          source: 'NOAA Space Weather Prediction Center (RTSW)',
          error: 'Unable to fetch live solar wind data',
        },
        { status: 502, headers: rateLimitHeaders },
      )
    }

    return NextResponse.json(
      {
        data: result,
        source: 'NOAA Space Weather Prediction Center (RTSW)',
      },
      { headers: rateLimitHeaders },
    )
  } catch (error) {
    logRouteError('solar-wind', error)

    return NextResponse.json(
      {
        data: {
          timestamp: new Date().toISOString(),
          current: { speed: 0, density: 0, temperature: 0, bz: 0, bt: 0 },
          trend: 'stable' as const,
          recent: [],
        },
        source: 'NOAA Space Weather Prediction Center',
        error: 'Unable to fetch live data',
      },
      { status: 500 },
    )
  }
  }, { context: 'solar-wind' })
}
