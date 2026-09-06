/**
 * 16-Bit Weather Platform - NWS Alerts API Route
 *
 * Returns active NWS alerts with optional state filter, full detail, GeoJSON,
 * or point-based queries for the warnings command center.
 */

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import {
  alertsToGeoJsonFeatureCollection,
  calculateWIS,
  countNwsProductTiers,
  countsFromAlerts,
  fetchActiveAlertsDetail,
  fetchHarmWarningAlerts,
  NwsPointOutOfBoundsError,
} from '@/lib/services/nws-alerts-service'
import { isUSLocation } from '@/lib/utils/location-utils'
import { loadCanonicalActiveAlerts } from '@/lib/bitwatch/ingest'
import { isSevereMonitorAlert } from '@/lib/services/severe-alert-filter'
import { createServiceRoleSupabaseClient } from '@/lib/supabase/service-role-client'
import { isExpectedUpstreamHttpError, logRouteError } from '@/lib/error-utils'
import { ApiError, withApiRoute } from '@/lib/api/with-api-route'
import type { NWSAlertDetail } from '@/lib/services/nws-alerts-service'

function parsePoint(raw: string | null): { lat: number; lon: number } | null {
  if (!raw) return null
  const parts = raw.split(',').map((s) => parseFloat(s.trim()))
  if (parts.length !== 2 || parts.some((n) => Number.isNaN(n))) return null
  const [lat, lon] = parts
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null
  return { lat, lon }
}

/** Set when the pin is outside NWS coverage, so an empty list is not "all clear". */
type AlertsCoverage = 'outside-nws'

const OUTSIDE_NWS = {
  details: [] as NWSAlertDetail[],
  freshness: 'live-fallback',
  coverage: 'outside-nws' as AlertsCoverage,
}

async function loadDetails(input: {
  harm: boolean
  point: { lat: number; lon: number } | null
}): Promise<{ details: NWSAlertDetail[]; freshness: string; coverage?: AlertsCoverage }> {
  if (input.point) {
    // NWS only answers for US points; anything else is a 400, not an outage.
    if (!isUSLocation(input.point.lat, input.point.lon)) return OUTSIDE_NWS
    try {
      const live = await fetchActiveAlertsDetail({ point: input.point })
      const details = input.harm ? live.filter(isSevereMonitorAlert) : live
      return { details, freshness: 'live-fallback' }
    } catch (error) {
      if (error instanceof NwsPointOutOfBoundsError) return OUTSIDE_NWS
      throw error
    }
  }

  const supabase = createServiceRoleSupabaseClient()
  if (supabase) {
    const canonical = await loadCanonicalActiveAlerts(supabase)
    if (canonical?.freshness === 'fresh') {
      const details = input.harm ? canonical.alerts.filter(isSevereMonitorAlert) : canonical.alerts
      return { details, freshness: canonical.freshness }
    }
  }

  const live = input.harm ? await fetchHarmWarningAlerts() : await fetchActiveAlertsDetail()
  const details = input.harm ? live.filter(isSevereMonitorAlert) : live
  return { details, freshness: 'live-fallback' }
}

export async function GET(request: NextRequest) {
  return withApiRoute(request, async ({ rateLimitHeaders }) => {
  try {
    const url = request.nextUrl
    const area = url.searchParams.get('area') ?? undefined
    const detail = url.searchParams.get('detail') === '1'
    const geojson = url.searchParams.get('geojson') === '1'
    const harm = url.searchParams.get('harm') === '1'
    const pointParam = url.searchParams.get('point')
    const point = parsePoint(pointParam)
    if (pointParam != null && pointParam.trim() !== '' && !point) {
      return NextResponse.json(
        { error: 'Invalid point parameter; use lat,lon in decimal degrees (WGS84).' },
        { status: 400, headers: rateLimitHeaders },
      )
    }

    let { details, freshness, coverage } = await loadDetails({ harm, point })
    const coverageField = coverage ? { coverage } : {}

    if (area) {
      details = details.filter((a) => a.areaDesc.toLowerCase().includes(area.toLowerCase()))
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

    const cacheControl =
      freshness === 'live-fallback'
        ? geojson || detail
          ? 'public, s-maxage=120, stale-while-revalidate=60'
          : 'public, s-maxage=300, stale-while-revalidate=60'
        : 'private, no-store'

    if (geojson) {
      const maxChars = point ? 12_000 : 2_500
      const fc = alertsToGeoJsonFeatureCollection(details, {
        maxDescriptionChars: maxChars,
        maxInstructionChars: maxChars,
      })
      return NextResponse.json(
        { ...fc, ...coverageField },
        { headers: { 'Cache-Control': cacheControl, ...rateLimitHeaders } },
      )
    }

    if (detail) {
      return NextResponse.json(
        { alerts: details, wis: wisMerged, total: details.length, freshness, ...coverageField },
        { headers: { 'Cache-Control': cacheControl, ...rateLimitHeaders } },
      )
    }

    return NextResponse.json(
      { alerts: summaries, wis: wisMerged, total: summaries.length, freshness, ...coverageField },
      { headers: { 'Cache-Control': cacheControl, ...rateLimitHeaders } },
    )
  } catch (error) {
    if (isExpectedUpstreamHttpError(error)) {
      throw new ApiError(502, 'Failed to fetch alerts')
    }
    logRouteError('Alerts API', error)
    return NextResponse.json({ error: 'Failed to fetch alerts' }, { status: 500 })
  }
  }, { context: 'Alerts API' })
}
