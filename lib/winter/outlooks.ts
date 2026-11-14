import { z } from 'zod'
import { createTtlCache } from '@/lib/cache/ttl-cache'
import { fetchWithTimeout } from '@/lib/fetch-with-timeout'
import type { WinterContourProperties, WinterLegendItem, WinterMapSelection, WinterMapSnapshot } from './types'

const SERVICE = 'https://mapservices.weather.noaa.gov/vector/rest/services/'
const MAX_RESPONSE_BYTES = 2_000_000
const cache = createTtlCache<WinterMapSnapshot>({ ttlMs: 300_000, maxEntries: 27 })

export const winterSelectionSchema = z.object({
  product: z.enum(['snow', 'ice', 'impacts']).default('snow'),
  day: z.coerce.number().int().min(1).max(3).default(1),
  threshold: z.coerce.number().refine(v => [4, 8, 12].includes(v)).default(4),
}).transform(value => value as WinterMapSelection)

const PROBABILITY_CATEGORIES = [
  ['Less than 10 percent', 'Less than 10%', '#94a3b8'],
  ['Slight (10-39%)', 'Slight · 10–39%', '#38bdf8'],
  ['Moderate (40-69%)', 'Moderate · 40–69%', '#818cf8'],
  ['High (70-100%)', 'High · 70–100%', '#e879f9'],
] as const
const IMPACT_CATEGORIES = [
  ['WINTER WEATHER AREA', 'Winter weather area', '#94a3b8'],
  ['MINOR', 'Minor impacts', '#facc15'],
  ['MODERATE', 'Moderate impacts', '#fb923c'],
  ['MAJOR', 'Major impacts', '#f87171'],
  ['EXTREME', 'Extreme impacts', '#c084fc'],
] as const

const position = z.tuple([z.number().finite().min(-180).max(180), z.number().finite().min(-90).max(90)])
const ring = z.array(position).min(4).max(100_000).refine(points =>
  points.length >= 4 && points[0][0] === points[points.length - 1][0] && points[0][1] === points[points.length - 1][1])
const polygon = z.array(ring).min(1)
const geometry = z.discriminatedUnion('type', [
  z.object({ type: z.literal('Polygon'), coordinates: polygon }),
  z.object({ type: z.literal('MultiPolygon'), coordinates: z.array(polygon).min(1) }),
])
const collectionSchema = z.object({
  type: z.literal('FeatureCollection'),
  exceededTransferLimit: z.boolean().optional(),
  features: z.array(z.object({ type: z.literal('Feature'), geometry, properties: z.record(z.string(), z.unknown()) })).max(2000),
})

/** NOAA GIS fields without offsets are documented UTC, never browser-local time. */
export function parseWinterSourceTime(value: unknown): string | null {
  if (typeof value !== 'string') return null
  let parts: number[] | null = null
  let match = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})(?:Z)?$/.exec(value)
  if (match) parts = match.slice(1).map(Number)
  match = /^(\d{4})-(\d{2})-(\d{2}) (\d{2})(\d{2})Z$/.exec(value)
  if (match) parts = [...match.slice(1).map(Number), 0]
  match = /^(\d{2})Z (\d{2})\/(\d{2})\/(\d{2})$/.exec(value)
  if (match) parts = [2000 + Number(match[4]), Number(match[2]), Number(match[3]), Number(match[1]), 0, 0]
  if (!parts) return null
  const [year, month, day, hour, minute, second] = parts
  const date = new Date(Date.UTC(year, month - 1, day, hour, minute, second))
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day ||
      date.getUTCHours() !== hour || date.getUTCMinutes() !== minute || date.getUTCSeconds() !== second) return null
  return date.toISOString()
}

function categories(selection: WinterMapSelection): readonly (readonly [string, string, string])[] {
  return selection.product === 'impacts' ? IMPACT_CATEGORIES : PROBABILITY_CATEGORIES
}

export function winterLayerUrl(selection: WinterMapSelection): string {
  const impact = selection.product === 'impacts'
  const id = impact ? selection.day : (selection.day - 1) * 5 +
    (selection.product === 'ice' ? 4 : selection.threshold === 4 ? 1 : selection.threshold === 8 ? 2 : 3)
  const url = new URL(`${SERVICE}${impact ? 'outlooks/wpc_wssi' : 'precip/wpc_prob_winter_precip'}/MapServer/${id}/query`)
  url.search = new URLSearchParams({
    where: '1=1', outFields: impact ? 'impact,issue_time,start_time,end_time,idp_source' : 'outlook,issue_time,start_time,end_time,idp_source',
    returnGeometry: 'true', outSR: '4326', f: 'geojson', resultRecordCount: '2000',
    // About 0.5 km display simplification; local values come from NWS grid forecasts.
    maxAllowableOffset: '0.005', geometryPrecision: '3',
  }).toString()
  return url.toString()
}

function baseSnapshot(selection: WinterMapSelection, now: number): WinterMapSnapshot {
  const legend: WinterLegendItem[] = categories(selection).map(([, label, color]) => ({ label, color }))
  return {
    selection, source: selection.product === 'impacts' ? 'NOAA / NWS Weather Prediction Center · WSSI' : 'NOAA / NWS Weather Prediction Center',
    sourceUrl: selection.product === 'impacts' ? 'https://www.wpc.ncep.noaa.gov/wwd/wssi/wssi.php' : 'https://www.wpc.ncep.noaa.gov/wwd/winter_wx.shtml',
    coverage: 'Contiguous United States', status: 'unavailable', issuedAt: null, validFrom: null, validTo: null,
    fetchedAt: new Date(now).toISOString(), message: null, legend,
    contours: { type: 'FeatureCollection', features: [] },
  }
}

function expectedSource(selection: WinterMapSelection): string {
  if (selection.product === 'impacts') return `WSSI_OVERALL_Day_${selection.day}`
  return `wwd_day${selection.day}_${selection.product === 'ice' ? 'picez_gt_25' : `psnow_gt_${String(selection.threshold).padStart(2, '0')}`}`
}

export function normalizeWinterOutlook(body: unknown, selection: WinterMapSelection, now = Date.now()): WinterMapSnapshot {
  const result = baseSnapshot(selection, now)
  const parsed = collectionSchema.safeParse(body)
  if (!parsed.success || parsed.data.exceededTransferLimit) {
    return { ...result, message: 'The source returned incomplete or invalid forecast contours. Please retry later.' }
  }
  if (!parsed.data.features.length) {
    return { ...result, message: 'No contours were returned and their forecast validity could not be verified. Check the official outlook.' }
  }
  const normalized = []
  for (const feature of parsed.data.features) {
    const p = feature.properties
    const issuedAt = parseWinterSourceTime(p.issue_time)
    const validFrom = parseWinterSourceTime(p.start_time)
    const validTo = parseWinterSourceTime(p.end_time)
    const category = categories(selection).findIndex(([key]) => key === p[selection.product === 'impacts' ? 'impact' : 'outlook'])
    if (!issuedAt || !validFrom || !validTo || Date.parse(validFrom) >= Date.parse(validTo) ||
        Date.parse(issuedAt) > now + 300_000 || category < 0 || p.idp_source !== expectedSource(selection)) {
      return { ...result, message: 'The source forecast category, product or validity could not be verified.' }
    }
    if (result.issuedAt && (result.issuedAt !== issuedAt || result.validFrom !== validFrom || result.validTo !== validTo)) {
      return { ...baseSnapshot(selection, now), message: 'The source is updating between forecast cycles. Retry for a consistent outlook.' }
    }
    Object.assign(result, { issuedAt, validFrom, validTo })
    const [key, label, color] = categories(selection)[category]
    const properties: WinterContourProperties = { category: key, label, color, rank: category }
    normalized.push({ ...feature, properties })
  }
  const maximumAge = (selection.product === 'impacts' ? 6 : 30) * 3_600_000
  if (Date.parse(result.validTo!) <= now || now - Date.parse(result.issuedAt!) >= maximumAge) {
    return { ...result, status: 'stale', message: 'This source forecast is expired or overdue for an update. Its contours are hidden.' }
  }
  return { ...result, status: 'available', contours: { type: 'FeatureCollection', features: normalized.sort((a, b) => a.properties.rank - b.properties.rank) } }
}

async function readBoundedJson(response: Response): Promise<unknown> {
  if (Number(response.headers.get('content-length')) > MAX_RESPONSE_BYTES) {
    await response.body?.cancel().catch(() => undefined)
    throw new Error('Oversized winter response')
  }
  const reader = response.body?.getReader()
  if (!reader) throw new Error('Missing winter response body')
  const chunks: Uint8Array[] = []
  let length = 0
  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      length += value.byteLength
      if (length > MAX_RESPONSE_BYTES) throw new Error('Oversized winter response')
      chunks.push(value)
    }
  } finally {
    await reader.cancel().catch(() => undefined)
    reader.releaseLock()
  }
  const bytes = new Uint8Array(length)
  let offset = 0
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength }
  return JSON.parse(new TextDecoder().decode(bytes)) as unknown
}

export async function fetchWinterOutlook(selection: WinterMapSelection): Promise<WinterMapSnapshot> {
  const key = `${selection.product}:${selection.day}:${selection.threshold}`
  const cached = cache.get(key)
  if (cached?.status === 'available' && winterOutlookCacheSeconds(cached) === 0) cache.delete(key)
  const snapshot = await cache.load(key, async () => {
    const response = await fetchWithTimeout(winterLayerUrl(selection), {
      timeoutMs: 12_000, maxRetries: 0, cache: 'no-store', redirect: 'error',
      headers: { 'User-Agent': '16BitWeather/1.0 (https://www.16bitweather.co)' },
    })
    if (!response.ok) {
      await response.body?.cancel().catch(() => undefined)
      throw new Error(`Winter outlook upstream status ${response.status}`)
    }
    return normalizeWinterOutlook(await readBoundedJson(response), selection)
  })
  // Cache freshness cannot extend meteorological validity.
  if (snapshot.status === 'available' && winterOutlookCacheSeconds(snapshot) === 0) {
    return { ...snapshot, status: 'stale', message: 'This source forecast has expired or is overdue for an update. Its contours are hidden.', contours: { type: 'FeatureCollection', features: [] } }
  }
  return snapshot
}

/** Neither server nor CDN caching may extend source validity or issuance freshness. */
export function winterOutlookCacheSeconds(snapshot: WinterMapSnapshot, now = Date.now()): number {
  if (snapshot.status !== 'available' || !snapshot.issuedAt || !snapshot.validTo) return 0
  const ceiling = (snapshot.selection.product === 'impacts' ? 6 : 30) * 3_600_000
  const lifetime = Math.min(Date.parse(snapshot.validTo) - now, Date.parse(snapshot.issuedAt) + ceiling - now)
  return Number.isFinite(lifetime) ? Math.max(0, Math.min(300, Math.floor(lifetime / 1000))) : 0
}
