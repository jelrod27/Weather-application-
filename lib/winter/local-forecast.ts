import { isInConus } from '@/lib/geo/point-in-polygon'
import { normalizeAccumulation, normalizeForecastPeriods, record, sourceTime } from './local-normalize'
import { pointMetadata } from './local-point'
import { fetchNwsPayload, safeNwsGridUrl, UnsupportedNwsPoint } from './local-source'
import type { LocalWinterForecast, WinterHourlyPeriod } from './local-types'

const HOURS_72 = 72 * 60 * 60_000
const STALE_SOURCE_MS = 18 * 60 * 60_000

function usableTime(data: unknown, now: number): string | null {
  const time = sourceTime(record(record(data).properties).updateTime)
  return time && Date.parse(time) <= now + 5 * 60_000 ? time : null
}

function coversHorizon(periods: Array<{ startTime: string; endTime: string }>, start: number, end: number): boolean {
  let coveredUntil = start
  for (const period of periods) {
    if (Date.parse(period.startTime) > coveredUntil) return false
    coveredUntil = Math.max(coveredUntil, Date.parse(period.endTime))
  }
  return coveredUntil >= end
}

function hasForecastContent(period: WinterHourlyPeriod): boolean {
  return Boolean(period.shortForecast.trim() || period.windSpeed?.trim() || period.windDirection?.trim())
    || period.temperatureF !== null || period.precipitationProbability !== null
}

/** Point discovery is authoritative; no forecasts are fabricated outside supported CONUS coverage. */
export async function fetchLocalWinterForecast(lat: number, lon: number): Promise<LocalWinterForecast> {
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) throw new Error('Invalid coordinates')
  const now = Date.now()
  const end = now + HOURS_72
  const base: LocalWinterForecast = {
    status: 'unavailable', coverage: 'conus',
    place: { name: `${lat.toFixed(4)}, ${lon.toFixed(4)}`, lat, lon, timeZone: null },
    fetchedAt: new Date(now).toISOString(), gridUpdatedAt: null, hourlyUpdatedAt: null, narrativeUpdatedAt: null,
    windowStart: new Date(now).toISOString(), windowEnd: new Date(end).toISOString(),
    sourceUrl: `https://forecast.weather.gov/MapClick.php?lat=${lat}&lon=${lon}`,
    message: 'The official local forecast is currently unavailable. Unknown amounts do not mean no snow or ice.',
    snow: normalizeAccumulation(undefined, now, end), ice: normalizeAccumulation(undefined, now, end), hourly: [], narrative: [],
  }
  const outside = (): LocalWinterForecast => ({ ...base, status: 'outside_coverage', coverage: 'unsupported', message: 'Local winter forecasts currently cover supported National Weather Service locations in the contiguous United States.' })
  if (!isInConus(lat, lon)) return outside()
  let point: Record<string, unknown>
  try {
    point = record(record((await fetchNwsPayload(`https://api.weather.gov/points/${lat.toFixed(4)},${lon.toFixed(4)}`, true)).data).properties)
  } catch (error) { return error instanceof UnsupportedNwsPoint ? outside() : base }
  const metadata = pointMetadata(point)
  if (!metadata) return { ...base, message: 'The official point location or timezone could not be verified.' }
  base.place = { ...base.place, ...metadata }
  const urls = [safeNwsGridUrl(point.forecastGridData, ''), safeNwsGridUrl(point.forecastHourly, '/forecast/hourly'), safeNwsGridUrl(point.forecast, '/forecast')]
  const sources = await Promise.allSettled(urls.map(url => url ? fetchNwsPayload(url) : Promise.reject(new Error('Invalid NWS resource URL'))))
  const payloads = sources.map(result => result.status === 'fulfilled' ? result.value : null)
  const [gridSource, hourlySource, narrativeSource] = payloads
  const gridUpdatedAt = usableTime(gridSource?.data, now)
  const hourlyUpdatedAt = usableTime(hourlySource?.data, now)
  const narrativeUpdatedAt = usableTime(narrativeSource?.data, now)
  const grid = gridUpdatedAt ? record(record(gridSource?.data).properties) : {}
  const snow = normalizeAccumulation(grid.snowfallAmount, now, end)
  const ice = normalizeAccumulation(grid.iceAccumulation, now, end)
  const hourly = hourlyUpdatedAt ? normalizeForecastPeriods(hourlySource?.data, now, end) : []
  const narrative = narrativeUpdatedAt ? normalizeForecastPeriods(narrativeSource?.data, now, end) : []
  const usableHourly = hourly.filter(hasForecastContent)
  const usableNarrative = narrative.filter(period => hasForecastContent(period) || period.detailedForecast.trim())
  const anyAvailable = snow.status !== 'unavailable' || ice.status !== 'unavailable' || usableHourly.length > 0 || usableNarrative.length > 0
  const partial = snow.status !== 'available' || ice.status !== 'available' || !coversHorizon(usableHourly, now, end) || !coversHorizon(usableNarrative, now, end)
  const stale = [gridUpdatedAt, usableHourly.length ? hourlyUpdatedAt : null, usableNarrative.length ? narrativeUpdatedAt : null]
    .some(time => time !== null && now - Date.parse(time) > STALE_SOURCE_MS)
  const status = !anyAvailable ? 'unavailable' : stale ? 'stale' : partial ? 'partial' : 'available'
  const acquired = payloads.flatMap(payload => payload ? [payload.fetchedAt] : []).sort()
  return {
    ...base, status, gridUpdatedAt, hourlyUpdatedAt, narrativeUpdatedAt, snow, ice, hourly, narrative,
    fetchedAt: acquired.at(-1) ?? base.fetchedAt,
    message: status === 'stale' ? 'One or more NWS forecast sources are older than 18 hours. Check the official forecast for updates.'
      : status === 'partial' ? 'Some source periods or forecast components are unavailable or only partially cover the requested future window.'
        : status === 'unavailable' ? base.message : null,
  }
}
