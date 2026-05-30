/**
 * 16-Bit Weather Platform - NWS Alerts Service
 *
 * Fetches NOAA api.weather.gov active alerts (GeoJSON), maps full properties
 * for the warnings command center, and computes WIS + NWS-style event counts.
 */

import { captureError } from '@/lib/error-utils'

const NWS_USER_AGENT =
  '16BitWeather/1.0 (https://16bitweather.co; ops@16bitweather.co)'

const NWS_ACCEPT = 'application/geo+json, application/json'

const NWS_FETCH_TIMEOUT_MS = 25_000

export interface AlertCounts {
  total: number
  severity: { extreme: number; severe: number; moderate: number; minor: number }
  urgency: { immediate: number; expected: number; future: number }
}

/** Slim alert row — backward compatible with dashboard / severe / situation. */
export interface NWSAlert {
  id: string
  headline: string
  event: string
  severity: 'Minor' | 'Moderate' | 'Severe' | 'Extreme'
  urgency: string
  expires: string
  areaDesc: string
}

/** Full alert for command center, maps, and drill-down. */
export interface NWSAlertDetail extends NWSAlert {
  sent: string
  effective: string
  ends: string
  description: string
  instruction: string
  certainty: string
  response: string
  sender: string
  geometry: NwsGeometry | null
}

/** Subset of GeoJSON geometry returned by NWS api.weather.gov alerts. */
export type NwsGeometry = {
  type: string
  coordinates: unknown
}

export interface WISScore {
  score: number
  level: 'green' | 'yellow' | 'orange' | 'red'
  label: string
  /** Severity buckets: Extreme + Severe (legacy field name). */
  activeWarnings: number
  /** Severity Moderate (legacy field name — not NWS “watch”). */
  activeWatches: number
  /** Severity Minor (legacy — not strictly NWS “advisory”). */
  activeAdvisories: number
  totalAlerts: number
  /** Parsed from `event` text: products containing “Warning”. */
  nwsWarnings: number
  /** Parsed from `event` text: products containing “Watch”. */
  nwsWatches: number
  /** Advisories / statements / other non-watch non-warning products. */
  nwsAdvisories: number
}

function normalizeSeverity(raw: string | undefined): NWSAlert['severity'] {
  const s = (raw ?? '').toLowerCase()
  if (s === 'extreme' || s === 'severe' || s === 'moderate' || s === 'minor') {
    return (raw!.charAt(0).toUpperCase() + raw!.slice(1).toLowerCase()) as NWSAlert['severity']
  }
  return 'Minor'
}

function asString(v: unknown): string {
  if (v == null) return ''
  if (typeof v === 'string') return v
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  return ''
}

function mapNwsFeatureToDetail(feature: {
  properties?: Record<string, unknown> | null
  geometry?: NwsGeometry | null
}): NWSAlertDetail {
  const p = (feature.properties ?? {}) as Record<string, unknown>
  const event = asString(p.event)
  const severity = normalizeSeverity(asString(p.severity))
  const geom = feature.geometry
  const geometry: NwsGeometry | null =
    geom && typeof geom === 'object' && 'type' in geom ? (geom as NwsGeometry) : null

  return {
    id: asString(p.id),
    headline: asString(p.headline),
    event,
    severity,
    urgency: asString(p.urgency),
    expires: asString(p.expires),
    areaDesc: asString(p.areaDesc),
    sent: asString(p.sent),
    effective: asString(p.effective),
    ends: asString(p.ends),
    description: asString(p.description),
    instruction: asString(p.instruction),
    certainty: asString(p.certainty),
    response: asString(p.response),
    sender: asString(p.sender),
    geometry,
  }
}

function toSummary(d: NWSAlertDetail): NWSAlert {
  return {
    id: d.id,
    headline: d.headline,
    event: d.event,
    severity: d.severity,
    urgency: d.urgency,
    expires: d.expires,
    areaDesc: d.areaDesc,
  }
}

export function classifyNwsProduct(event: string): 'warning' | 'watch' | 'advisory' {
  const e = event.toLowerCase()
  if (e.includes('warning')) return 'warning'
  if (e.includes('watch')) return 'watch'
  return 'advisory'
}

export function countNwsProductTiers(details: Pick<NWSAlertDetail, 'event'>[]): {
  nwsWarnings: number
  nwsWatches: number
  nwsAdvisories: number
} {
  let nwsWarnings = 0
  let nwsWatches = 0
  let nwsAdvisories = 0
  for (const d of details) {
    const t = classifyNwsProduct(d.event)
    if (t === 'warning') nwsWarnings++
    else if (t === 'watch') nwsWatches++
    else nwsAdvisories++
  }
  return { nwsWarnings, nwsWatches, nwsAdvisories }
}

async function fetchNwsFeatureCollection(url: string): Promise<{
  type: 'FeatureCollection'
  features: Array<{
    type?: string
    properties?: Record<string, unknown> | null
    geometry?: NwsGeometry | null
  }>
}> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), NWS_FETCH_TIMEOUT_MS)
  let response: Response
  try {
    response = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': NWS_USER_AGENT, Accept: NWS_ACCEPT },
    })
  } finally {
    clearTimeout(timer)
  }
  if (!response.ok) {
    throw new Error(`NWS alerts HTTP ${response.status}`)
  }
  const data = (await response.json()) as {
    type?: string
    features?: unknown[]
  }
  if (!data || data.type !== 'FeatureCollection' || !Array.isArray(data.features)) {
    return { type: 'FeatureCollection', features: [] }
  }
  return {
    type: 'FeatureCollection',
    features: data.features as Array<{
      type?: string
      properties?: Record<string, unknown> | null
      geometry?: NwsGeometry | null
    }>,
  }
}

export function nationalActiveAlertsUrl(): string {
  return 'https://api.weather.gov/alerts/active?status=actual&message_type=alert'
}

export function pointActiveAlertsUrl(lat: number, lon: number): string {
  return `https://api.weather.gov/alerts/active?status=actual&message_type=alert&point=${lat},${lon}`
}

export async function fetchActiveAlertsDetail(options?: {
  point?: { lat: number; lon: number }
}): Promise<NWSAlertDetail[]> {
  const url = options?.point
    ? pointActiveAlertsUrl(options.point.lat, options.point.lon)
    : nationalActiveAlertsUrl()
  const fc = await fetchNwsFeatureCollection(url)
  return fc.features.map((f) => mapNwsFeatureToDetail(f))
}

export async function fetchActiveAlerts(): Promise<NWSAlert[]> {
  try {
    const details = await fetchActiveAlertsDetail()
    return details.map(toSummary)
  } catch (error) {
    // Surface NWS API outages instead of silently reporting "no alerts" — a
    // dead upstream here means users see an all-clear that may be wrong.
    captureError(error, 'nws-alerts:fetchActiveAlerts')
    return []
  }
}

/** GeoJSON for OpenLayers — truncates long text on national feed to limit payload. */
export function alertsToGeoJsonFeatureCollection(
  details: NWSAlertDetail[],
  options?: { maxDescriptionChars?: number; maxInstructionChars?: number }
): {
  type: 'FeatureCollection'
  features: Array<{
    type: 'Feature'
    geometry: NwsGeometry | null
    properties: Record<string, string>
  }>
} {
  const maxD = options?.maxDescriptionChars ?? 4000
  const maxI = options?.maxInstructionChars ?? 4000
  const features = details.map((d) => ({
    type: 'Feature' as const,
    geometry: d.geometry,
    properties: {
      id: d.id,
      headline: d.headline,
      event: d.event,
      severity: d.severity,
      urgency: d.urgency,
      expires: d.expires,
      areaDesc: d.areaDesc,
      sent: d.sent,
      effective: d.effective,
      ends: d.ends,
      description:
        d.description.length > maxD ? `${d.description.slice(0, maxD)}…` : d.description,
      instruction:
        d.instruction.length > maxI ? `${d.instruction.slice(0, maxI)}…` : d.instruction,
      certainty: d.certainty,
      response: d.response,
      sender: d.sender,
    },
  }))
  return { type: 'FeatureCollection', features }
}

export async function fetchAlertCounts(): Promise<AlertCounts> {
  try {
    // Call fetchActiveAlertsDetail directly (not fetchActiveAlerts, which
    // swallows errors and returns []) so a real outage propagates here and is
    // captured with this function's own context instead of being silently zeroed.
    const details = await fetchActiveAlertsDetail()
    return countsFromAlerts(details.map(toSummary))
  } catch (error) {
    captureError(error, 'nws-alerts:fetchAlertCounts')
    return {
      total: 0,
      severity: { extreme: 0, severe: 0, moderate: 0, minor: 0 },
      urgency: { immediate: 0, expected: 0, future: 0 },
    }
  }
}

export async function getWISScore(): Promise<WISScore> {
  try {
    const details = await fetchActiveAlertsDetail()
    const summaries = details.map(toSummary)
    const counts = countsFromAlerts(summaries)
    const wis = calculateWIS(counts)
    const { nwsWarnings, nwsWatches, nwsAdvisories } = countNwsProductTiers(details)
    return { ...wis, nwsWarnings, nwsWatches, nwsAdvisories }
  } catch (error) {
    captureError(error, 'nws-alerts:getWISScore')
    return {
      score: 0,
      level: 'green',
      label: 'LOW',
      activeWarnings: 0,
      activeWatches: 0,
      activeAdvisories: 0,
      totalAlerts: 0,
      nwsWarnings: 0,
      nwsWatches: 0,
      nwsAdvisories: 0,
    }
  }
}

export function countsFromAlerts(alerts: NWSAlert[]): AlertCounts {
  const counts: AlertCounts = {
    total: alerts.length,
    severity: { extreme: 0, severe: 0, moderate: 0, minor: 0 },
    urgency: { immediate: 0, expected: 0, future: 0 },
  }
  for (const alert of alerts) {
    const sev = alert.severity?.toLowerCase() as keyof typeof counts.severity
    if (sev in counts.severity) counts.severity[sev]++
    const urg = alert.urgency?.toLowerCase() as keyof typeof counts.urgency
    if (urg in counts.urgency) counts.urgency[urg]++
  }
  return counts
}

export function calculateWIS(counts: AlertCounts): WISScore {
  const { severity } = counts
  const rawScore =
    severity.extreme * 12 +
    severity.severe * 9 +
    severity.moderate * 4 +
    severity.minor * 1
  const score = Math.min(100, Math.round((rawScore / 600) * 100))

  let level: WISScore['level']
  let label: string
  if (score >= 75) {
    level = 'red'
    label = 'EXTREME'
  } else if (score >= 50) {
    level = 'orange'
    label = 'HIGH'
  } else if (score >= 25) {
    level = 'yellow'
    label = 'MODERATE'
  } else {
    level = 'green'
    label = 'LOW'
  }

  return {
    score,
    level,
    label,
    activeWarnings: severity.extreme + severity.severe,
    activeWatches: severity.moderate,
    activeAdvisories: severity.minor,
    totalAlerts: counts.total,
    nwsWarnings: 0,
    nwsWatches: 0,
    nwsAdvisories: 0,
  }
}
