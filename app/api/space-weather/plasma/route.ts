/**
 * Solar wind plasma + magnetic field time series from NOAA SWPC RTSW.
 */

import { type NextRequest, NextResponse } from 'next/server'
import { fetchRtswFeeds, selectRtswWindSeries } from '@/lib/services/swpc-solar-wind'
import { swpcTimeTagMs } from '@/lib/space-weather/time-tag'
import { SPACE_WEATHER_CACHE } from '@/lib/space-weather/series-route'
import { logRouteError } from '@/lib/error-utils'
import { withApiRoute } from '@/lib/api/with-api-route'

export interface PlasmaEntry {
  time: string
  speed: number
  density: number
  temperature: number
  bz: number | null
  by: number | null
  bx: number | null
  bt: number | null
}

const RANGE_MS: Record<string, number> = {
  '30m': 30 * 60 * 1000,
  '1h': 60 * 60 * 1000,
  '2h': 2 * 60 * 60 * 1000,
  '6h': 6 * 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
}

type MagRow = {
  time_tag?: string
  source?: string
  active?: boolean
  bx_gsm?: number | null
  by_gsm?: number | null
  bz_gsm?: number | null
  bt?: number | null
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  return withApiRoute(request, async ({ rateLimitHeaders }) => {
  try {
    const { searchParams } = request.nextUrl
    const rangeParam = searchParams.get('range')
    const range = rangeParam ?? '6h'
    if (!Object.prototype.hasOwnProperty.call(RANGE_MS, range)) {
      return NextResponse.json(
        { error: 'Invalid range. Use one of: 30m, 1h, 2h, 6h, 24h, 7d' },
        { status: 400, headers: rateLimitHeaders },
      )
    }
    const rangeMs = RANGE_MS[range]!

    const { windJson, magJson } = await fetchRtswFeeds()

    const now = Date.now()
    const cutoff = now - rangeMs
    const boundedWind = Array.isArray(windJson) ? windJson.filter(row => {
      const time = swpcTimeTagMs(row?.time_tag)
      return time >= cutoff && time <= now
    }) : []
    const windRows = selectRtswWindSeries(boundedWind)
    const reference = windRows.at(-1)
    const magMap = new Map<number, { bx: number; by: number; bz: number; bt: number }>()

    if (Array.isArray(magJson)) {
      for (const row of magJson as MagRow[]) {
        if (!row || !reference) continue
        const sameSource = reference.source
          ? row.source === reference.source
          : !row.source && Boolean(row.active) === Boolean(reference.active)
        const time = swpcTimeTagMs(row.time_tag)
        if (!sameSource || !Number.isFinite(time)) continue
        const bx = row.bx_gsm
        const by = row.by_gsm
        const bz = row.bz_gsm
        const bt = row.bt
        if (
          typeof bx !== 'number' ||
          typeof by !== 'number' ||
          typeof bz !== 'number' ||
          typeof bt !== 'number' ||
          ![bx, by, bz, bt].every(Number.isFinite)
        ) {
          continue
        }
        magMap.set(time, { bx, by, bz, bt })
      }
    }

    const series: PlasmaEntry[] = []
    for (const row of windRows) {
        const entryTime = swpcTimeTagMs(row.time_tag)

        const speed = row.proton_speed
        const density = row.proton_density
        const temperature = row.proton_temperature
        if (
          typeof speed !== 'number' ||
          typeof density !== 'number' ||
          typeof temperature !== 'number' ||
          speed <= 0 ||
          ![speed, density, temperature].every(Number.isFinite)
        ) {
          continue
        }

        const mag = magMap.get(entryTime)
        series.push({
          time: new Date(entryTime).toISOString(),
          speed: Math.round(speed),
          density: Math.round(density * 100) / 100,
          temperature: Math.round(temperature),
          bz: mag ? Math.round(mag.bz * 100) / 100 : null,
          by: mag ? Math.round(mag.by * 100) / 100 : null,
          bx: mag ? Math.round(mag.bx * 100) / 100 : null,
          bt: mag ? Math.round(mag.bt * 100) / 100 : null,
        })
    }

    if (series.length === 0) {
      return NextResponse.json(
        { error: 'Unable to build plasma series from RTSW feeds', range },
        { status: 502, headers: rateLimitHeaders },
      )
    }

    return NextResponse.json(
      {
        data: series,
        range,
        source: 'NOAA Space Weather Prediction Center (RTSW)',
        spacecraft: reference?.source ?? null,
        magneticAvailable: series.some(row => row.bz !== null),
      },
      {
        headers: {
          'Cache-Control': SPACE_WEATHER_CACHE.realtime,
          ...rateLimitHeaders,
        },
      },
    )
  } catch (error) {
    logRouteError('Plasma', error)

    return NextResponse.json(
      { error: 'Failed to fetch solar wind plasma data' },
      { status: 500 },
    )
  }
  }, { context: 'Plasma' })
}
