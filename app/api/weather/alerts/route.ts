/**
 * 16-Bit Weather Platform - NWS Alerts API Route
 *
 * Returns active NWS alerts with optional state filter, full detail, GeoJSON,
 * or point-based queries for the warnings command center.
 */

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server'
import {
  alertsToGeoJsonFeatureCollection,
  calculateWIS,
  countNwsProductTiers,
  countsFromAlerts,
  fetchActiveAlertsDetail,
} from '@/lib/services/nws-alerts-service'
import { logRouteError } from '@/lib/error-utils'

function parsePoint(raw: string | null): { lat: number; lon: number } | null {
  if (!raw) return null
  const parts = raw.split(',').map((s) => parseFloat(s.trim()))
  if (parts.length !== 2 || parts.some((n) => Number.isNaN(n))) return null
  const [lat, lon] = parts
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null
  return { lat, lon }
}

export async function GET(request: NextRequest) {
  try {
    const url = request.nextUrl
    const area = url.searchParams.get('area') ?? undefined
    const detail = url.searchParams.get('detail') === '1'
    const geojson = url.searchParams.get('geojson') === '1'
    const pointParam = url.searchParams.get('point')
    const point = parsePoint(pointParam)
    if (pointParam != null && pointParam.trim() !== '' && !point) {
      return NextResponse.json(
        { error: 'Invalid point parameter; use lat,lon in decimal degrees (WGS84).' },
        { status: 400 }
      )
    }

    let details = await fetchActiveAlertsDetail(point ? { point } : undefined)

    if (area) {
      details = details.filter((a) =>
        a.areaDesc.toLowerCase().includes(area.toLowerCase())
      )
    }

    const summaries = details.map((d) => ({
      id: d.id,
      headline: d.headline,
      event: d.event,
      severity: d.severity,
      urgency: d.urgency,
      expires: d.expires,
      areaDesc: d.areaDesc,
    }))

    const counts = countsFromAlerts(summaries)
    const wis = calculateWIS(counts)
    const tiers = countNwsProductTiers(details)
    const wisMerged = { ...wis, ...tiers }

    const cacheShort = geojson || detail
    const cacheControl = cacheShort
      ? 'public, s-maxage=120, stale-while-revalidate=60'
      : 'public, s-maxage=300, stale-while-revalidate=60'

    if (geojson) {
      const maxChars = point ? 12_000 : 2_500
      const fc = alertsToGeoJsonFeatureCollection(details, {
        maxDescriptionChars: maxChars,
        maxInstructionChars: maxChars,
      })
      return NextResponse.json(fc, {
        headers: { 'Cache-Control': cacheControl },
      })
    }

    if (detail) {
      const body = {
        alerts: details,
        wis: wisMerged,
        total: details.length,
      }
      return NextResponse.json(body, {
        headers: { 'Cache-Control': cacheControl },
      })
    }

    return NextResponse.json(
      { alerts: summaries, wis: wisMerged, total: summaries.length },
      { headers: { 'Cache-Control': cacheControl } }
    )
  } catch (error) {
    logRouteError('Alerts API', error)
    return NextResponse.json({ error: 'Failed to fetch alerts' }, { status: 500 })
  }
}
