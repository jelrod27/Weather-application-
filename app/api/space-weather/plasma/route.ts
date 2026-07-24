/**
 * Solar wind plasma + magnetic field time series from NOAA SWPC RTSW.
 */

import { type NextRequest, NextResponse } from 'next/server'
import { fetchRtswFeeds } from '@/lib/services/swpc-solar-wind'

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

type WindRow = {
  time_tag?: string
  active?: boolean
  proton_speed?: number | null
  proton_density?: number | null
  proton_temperature?: number | null
}

type MagRow = {
  time_tag?: string
  bx_gsm?: number | null
  by_gsm?: number | null
  bz_gsm?: number | null
  bt?: number | null
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const rangeParam = searchParams.get('range')
    const range = rangeParam ?? '6h'
    if (!Object.prototype.hasOwnProperty.call(RANGE_MS, range)) {
      return NextResponse.json(
        { error: 'Invalid range. Use one of: 30m, 1h, 2h, 6h, 24h, 7d' },
        { status: 400 },
      )
    }
    const rangeMs = RANGE_MS[range]!

    const { windJson, magJson } = await fetchRtswFeeds()

    const magMap = new Map<string, { bx: number; by: number; bz: number; bt: number }>()

    if (Array.isArray(magJson)) {
      for (const row of magJson as MagRow[]) {
        const timeTag = row.time_tag
        if (!timeTag) continue
        const bx = row.bx_gsm
        const by = row.by_gsm
        const bz = row.bz_gsm
        const bt = row.bt
        if (
          typeof bx !== 'number' ||
          typeof by !== 'number' ||
          typeof bz !== 'number' ||
          typeof bt !== 'number'
        ) {
          continue
        }
        magMap.set(timeTag, { bx, by, bz, bt })
      }
    }

    const series: PlasmaEntry[] = []
    const now = Date.now()
    const cutoff = now - rangeMs

    if (Array.isArray(windJson)) {
      for (const row of windJson as WindRow[]) {
        const timeTag = row.time_tag
        if (!timeTag) continue
        const entryTime = new Date(timeTag).getTime()
        if (Number.isNaN(entryTime) || entryTime < cutoff) continue

        const speed = row.proton_speed
        const density = row.proton_density
        const temperature = row.proton_temperature
        if (
          typeof speed !== 'number' ||
          typeof density !== 'number' ||
          typeof temperature !== 'number' ||
          speed <= 0
        ) {
          continue
        }

        const mag = magMap.get(timeTag)
        series.push({
          time: timeTag,
          speed: Math.round(speed),
          density: Math.round(density * 100) / 100,
          temperature: Math.round(temperature),
          bz: mag ? Math.round(mag.bz * 100) / 100 : null,
          by: mag ? Math.round(mag.by * 100) / 100 : null,
          bx: mag ? Math.round(mag.bx * 100) / 100 : null,
          bt: mag ? Math.round(mag.bt * 100) / 100 : null,
        })
      }
    }

    if (series.length === 0) {
      return NextResponse.json(
        { error: 'Unable to build plasma series from RTSW feeds', range },
        { status: 502 },
      )
    }

    return NextResponse.json(
      {
        data: series,
        range,
        source: 'NOAA Space Weather Prediction Center (RTSW)',
        magneticAvailable: magMap.size > 0,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30',
        },
      },
    )
  } catch (error) {
    console.error('[Plasma]', error)

    return NextResponse.json(
      { error: 'Failed to fetch solar wind plasma data' },
      { status: 500 },
    )
  }
}
