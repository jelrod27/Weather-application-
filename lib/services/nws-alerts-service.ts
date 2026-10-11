/**
 * 16-Bit Weather Platform - NWS Alerts Service
 *
 * Fetches NOAA api.weather.gov active alerts (GeoJSON), maps full properties
 * for the warnings command center, and computes WIS + NWS-style event counts.
 */

import { selectActiveAlerts } from '@/lib/warnings/active-alerts'
import { captureError } from '@/lib/error-utils'
import { parseTimeMotLoc, type StormMotion } from '@/lib/bitwatch/motion'
import { parseVtecFromParameters, provisionalWarningEventId } from '@/lib/bitwatch/vtec'
import { HARM_WARNING_EVENTS } from '@/lib/services/severe-alert-filter'
import {
  parseNwsHazardParameters,
  type NwsHazardParameters,
} from '@/lib/warnings/nws-parameters'

const NWS_USER_AGENT =
  '16BitWeather/1.0 (https://16bitweather.co; ops@16bitweather.co)'

const NWS_ACCEPT = 'application/geo+json, application/json'

const NWS_FETCH_TIMEOUT_MS = 25_000

export function nwsContinuationUrl(raw: unknown): string | null {
  if (typeof raw !== 'string' || !raw.trim()) return null
  try {
    const url = new URL(raw)
    if (url.protocol !== 'https:') return null
    if (url.hostname !== 'api.weather.gov') return null
    if (url.port) return null
    if (url.username || url.password) return null
    return url.toString()
  } catch {
    return null
  }
}

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
  severity: 'Minor' | 'Moderate' | 'Severe' | 'Extreme' | 'Unknown'
  urgency: string
  expires: string
  areaDesc: string
}

/** Full alert for command center, maps, and drill-down. */
export interface NWSAlertDetail extends NWSAlert {
  status?: string
  senderName?: string
  productUrl?: string
  referenceIds?: string[]
  sent: string
  effective: string
  ends: string
  description: string
  instruction: string
  certainty: string
  response: string
  sender: string
  geometry: NwsGeometry | null
  /** Hail / wind / source parsed from NWS CAP `parameters` with description fallbacks. */
  hazard: NwsHazardParameters
  messageType: string
  warningEventId: string
  vtecAction: string | null
  vtecRaw: string[]
  ugc: string[]
  affectedZones: string[]
  motion: StormMotion | null
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
  return 'Unknown'
}

function asString(v: unknown): string {
  if (v == null) return ''
  if (typeof v === 'string') return v
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  return ''
}

function stringList(value: unknown): string[] {
  if (typeof value === 'string' && value.trim()) return [value.trim()]
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
}

export function mapNwsFeatureToDetail(feature: {
  properties?: Record<string, unknown> | null
  geometry?: NwsGeometry | null
}): NWSAlertDetail {
  const p = (feature.properties ?? {}) as Record<string, unknown>
  const event = asString(p.event)
  const severity = normalizeSeverity(asString(p.severity))
  const geom = feature.geometry
  const geometry: NwsGeometry | null =
    geom && typeof geom === 'object' && 'type' in geom ? (geom as NwsGeometry) : null
  const description = asString(p.description)
  const rawParameters =
    p.parameters && typeof p.parameters === 'object' && !Array.isArray(p.parameters)
      ? (p.parameters as Record<string, unknown>)
      : null
  const sent = asString(p.sent)
  const nwsId = asString(p.id)
  const vtecs = parseVtecFromParameters(rawParameters, description, sent)
  const primary = vtecs[0] ?? null
  const geocode =
    p.geocode && typeof p.geocode === 'object' && !Array.isArray(p.geocode)
      ? (p.geocode as Record<string, unknown>)
      : null
  const vtecRaw = stringList(rawParameters?.VTEC ?? rawParameters?.vtec)
  const awips = stringList(rawParameters?.AWIPSidentifier)[0]?.match(/^([A-Z0-9]{3})([A-Z0-9]{3,4})$/i)

  return {
    status: asString(p.status),
    referenceIds: Array.isArray(p.references) ? p.references.map(reference =>
      reference && typeof reference === 'object' ? asString(reference.identifier) : '').filter(Boolean) : [],
    senderName: asString(p.senderName),
    productUrl: awips ? `https://forecast.weather.gov/product.php?${new URLSearchParams({
      site: 'NWS', issuedby: awips[2].toUpperCase(), product: awips[1].toUpperCase(), format: 'CI', version: '1', glossary: '0',
    })}` : undefined,
    id: nwsId,
    headline: asString(p.headline),
    event,
    severity,
    urgency: asString(p.urgency),
    expires: asString(p.expires),
    areaDesc: asString(p.areaDesc),
    sent,
    effective: asString(p.effective),
    ends: asString(p.ends),
    description,
    instruction: asString(p.instruction),
    certainty: asString(p.certainty),
    response: asString(p.response),
    sender: asString(p.sender),
    geometry,
    hazard: parseNwsHazardParameters(rawParameters, description),
    messageType: asString(p.messageType) || 'Alert',
    warningEventId: primary?.eventId ?? provisionalWarningEventId(nwsId),
    vtecAction: primary?.action ?? null,
    vtecRaw,
    ugc: stringList(geocode?.UGC ?? geocode?.ugc),
    affectedZones: stringList(p.affectedZones),
    motion: parseTimeMotLoc(description),
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

/**
 * api.weather.gov answers `400 Parameter "point" is invalid: out of bounds`
 * for a pin outside NWS coverage (Canada, Mexico, Europe). That is a fact
 * about the pin, not an upstream failure, so callers get a typed error they
 * can turn into "no NWS coverage here" instead of a 5xx.
 */
export class NwsPointOutOfBoundsError extends Error {
  constructor() {
    super('NWS point outside coverage')
    this.name = 'NwsPointOutOfBoundsError'
  }
}

async function isNwsPointOutOfBounds(response: Response): Promise<boolean> {
  try {
    const body = (await response.json()) as { detail?: unknown }
    return typeof body?.detail === 'string' && /out of bounds/i.test(body.detail)
  } catch {
    return false
  }
}

async function fetchNwsFeatureCollection(url: string, timeoutMs = NWS_FETCH_TIMEOUT_MS, noStore = false): Promise<{
  type: 'FeatureCollection'
  features: Array<{
    type?: string
    properties?: Record<string, unknown> | null
    geometry?: NwsGeometry | null
  }>
  paginationNext: string | null
  invalidPagination: boolean
  generatedAt: string
}> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  let response: Response
  try {
    response = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': NWS_USER_AGENT, Accept: NWS_ACCEPT },
      ...(noStore ? { cache: 'no-store' as const } : {}),
    })
  if (!response.ok) {
    if (response.status === 400 && (await isNwsPointOutOfBounds(response))) {
      throw new NwsPointOutOfBoundsError()
    }
    throw new Error(`NWS alerts HTTP ${response.status}`)
  }
  if (noStore && Number(response.headers?.get('age') ?? 0) > 300) throw new Error('NWS snapshot is stale')
  const data = (await response.json()) as {
    type?: string
    features?: unknown[]
    pagination?: { next?: string }
  }
  if (!data || data.type !== 'FeatureCollection' || !Array.isArray(data.features)) {
    throw new Error('Malformed NWS alert collection')
  }
  const next = nwsContinuationUrl(data.pagination?.next)
  return {
    type: 'FeatureCollection',
    features: data.features as Array<{
      type?: string
      properties?: Record<string, unknown> | null
      geometry?: NwsGeometry | null
    }>,
    paginationNext: next,
    invalidPagination: data.pagination?.next != null && !next,
    generatedAt: new Date(Date.now() - Math.max(0, Number(response.headers?.get('age')) || 0) * 1000).toISOString(),
  }
  } finally {
    clearTimeout(timer)
  }
}

export interface NwsAlertSnapshot {
  alerts: NWSAlertDetail[]
  received: number
  rejected: number
  pages: number
  truncated: boolean
  issues: string[]
  generatedAt?: string
}

/** Bounded national collection for consumers that must report incomplete coverage.
 * A later-page failure preserves the earlier evidence, but cannot certify active status. */
export async function fetchNwsAlertSnapshot(startUrl: string, maxPages = 8): Promise<NwsAlertSnapshot> {
  const result: NwsAlertSnapshot = { alerts: [], received: 0, rejected: 0, pages: 0, truncated: false, issues: [] }
  const visited = new Set<string>()
  const messages = new Map<string, string>()
  const deadline = Date.now() + 20_000
  let url: string | null = nwsContinuationUrl(startUrl)
  if (!url) throw new Error('Invalid NWS collection URL')
  while (url && result.pages < maxPages && Date.now() < deadline) {
    if (visited.has(url)) { result.issues.push('NWS pagination repeated a page'); break }
    visited.add(url)
    try {
      const fc = await fetchNwsFeatureCollection(url, Math.max(1, deadline - Date.now()), true)
      result.pages += 1
      result.generatedAt = result.generatedAt && result.generatedAt < fc.generatedAt ? result.generatedAt : fc.generatedAt
      result.received += fc.features.length
      if (fc.features.length > 500) { result.truncated = true; result.issues.push('NWS page exceeded the record limit') }
      for (const feature of fc.features.slice(0, 500)) {
        if (!feature || typeof feature !== 'object' || !feature.properties) { result.rejected++; continue }
        const alert = mapNwsFeatureToDetail(feature)
        const terminal = alert.messageType === 'Cancel' || ['CAN', 'EXP', 'UPG'].includes(alert.vtecAction ?? '')
        if (!['Alert', 'Update', 'Cancel'].includes(asString(feature.properties.messageType)) ||
            !alert.id || !alert.event || !alert.areaDesc || alert.status !== 'Actual' ||
            !Number.isFinite(Date.parse(alert.sent)) || Date.parse(alert.sent) > Date.now() + 60_000 ||
            (alert.ends && !Number.isFinite(Date.parse(alert.ends))) ||
            !['Alert', 'Update', 'Cancel'].includes(alert.messageType) ||
            (!terminal && (!Number.isFinite(Date.parse(alert.effective)) || !Number.isFinite(Date.parse(alert.expires))))) {
          result.rejected++; continue
        }
        const signature = JSON.stringify(feature)
        if (messages.has(alert.id)) {
          if (messages.get(alert.id) !== signature) result.issues.push('NWS message identifier has conflicting revisions')
          continue
        }
        messages.set(alert.id, signature)
        // Without VTEC, the existing geographic lifecycle selector cannot prove
        // which areas a CAP revision replaces. References remain available, but
        // this snapshot must not certify the old message as still active.
        if (alert.warningEventId.startsWith('provisional:') &&
            (alert.messageType !== 'Alert' || alert.referenceIds?.length)) {
          result.issues.push('NWS revision has no validated warning-event identity')
        }
        const vtecs = parseVtecFromParameters({ VTEC: alert.vtecRaw }, alert.description, alert.sent)
        result.alerts.push(...(vtecs.length ? vtecs.map(vtec => ({ ...alert, warningEventId: vtec.eventId, vtecAction: vtec.action })) : [alert]))
      }
      url = fc.paginationNext
      if (fc.invalidPagination) { result.issues.push('NWS continuation link is invalid'); result.truncated = true; break }
    } catch {
      if (!result.pages) throw new Error('NWS alert collection unavailable or malformed')
      result.issues.push('NWS pagination stopped before coverage could be verified')
      break
    }
  }
  if (url) { result.truncated = true; result.issues.push('NWS collection is incomplete') }
  if (result.rejected) result.issues.push('Some NWS records could not be validated')
  return result
}

export async function fetchNwsAlertPages(startUrl: string, maxPages = 8): Promise<NWSAlertDetail[]> {
  const details: NWSAlertDetail[] = []
  const seen = new Set<string>()
  let url: string | null = startUrl
  let pages = 0
  while (url && pages < maxPages) {
    pages += 1
    const fc = await fetchNwsFeatureCollection(url)
    for (const feature of fc.features) {
      const mapped = mapNwsFeatureToDetail(feature)
      if (!mapped.id || seen.has(mapped.id)) continue
      seen.add(mapped.id)
      details.push(mapped)
    }
    url = fc.paginationNext
  }
  return details
}

export function nationalActiveAlertsUrl(): string {
  return 'https://api.weather.gov/alerts/active?status=actual'
}

export function pointActiveAlertsUrl(lat: number, lon: number): string {
  return `https://api.weather.gov/alerts/active?status=actual&point=${lat},${lon}`
}

export function harmWarningActiveAlertsUrl(): string {
  const event = HARM_WARNING_EVENTS.map((name) => encodeURIComponent(name)).join(',')
  return `https://api.weather.gov/alerts/active?status=actual&event=${event}`
}

export function harmWarningCollectionUrl(startIso?: string): string {
  const params = new URLSearchParams({
    status: 'actual',
    message_type: 'alert,update,cancel',
    event: HARM_WARNING_EVENTS.join(','),
    limit: '500',
  })
  if (startIso) params.set('start', startIso)
  return `https://api.weather.gov/alerts?${params.toString()}`
}

/** One CAP message may end a watch and start its replacement warning. Resolve
 * all event actions first, then return each surviving source product once. */
function activeFeatureDetails(features: Parameters<typeof mapNwsFeatureToDetail>[0][]): NWSAlertDetail[] {
  const messages = features.flatMap((feature) => {
    const detail = mapNwsFeatureToDetail(feature)
    const vtecs = parseVtecFromParameters({ VTEC: detail.vtecRaw }, detail.description, detail.sent)
    return vtecs.length ? vtecs.map((vtec) => ({
      ...detail, warningEventId: vtec.eventId, vtecAction: vtec.action,
    })) : [detail]
  })
  return [...new Map(selectActiveAlerts(messages).map((alert) => [alert.id, alert])).values()]
}

export async function fetchActiveAlertsDetail(options?: {
  point?: { lat: number; lon: number }
}): Promise<NWSAlertDetail[]> {
  const url = options?.point
    ? pointActiveAlertsUrl(options.point.lat, options.point.lon)
    : nationalActiveAlertsUrl()
  const fc = await fetchNwsFeatureCollection(url)
  return activeFeatureDetails(fc.features)
}

export async function fetchHarmWarningAlerts(): Promise<NWSAlertDetail[]> {
  const fc = await fetchNwsFeatureCollection(harmWarningActiveAlertsUrl())
  return activeFeatureDetails(fc.features)
}

export async function fetchActiveAlerts(): Promise<NWSAlert[]> {
  try {
    const details = await fetchActiveAlertsDetail()
    return details.map(toSummary)
  } catch (error) {
    // Preserve unavailable status; an upstream failure is not an all-clear.
    captureError(error, 'nws-alerts:fetchActiveAlerts')
    throw error
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
    const details = await fetchActiveAlertsDetail()
    return countsFromAlerts(details.map(toSummary))
  } catch (error) {
    captureError(error, 'nws-alerts:fetchAlertCounts')
    throw error
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
    throw error
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
