import { z } from 'zod'
import { isStargazerTimeZone, formatObservingTime } from '@/lib/stargazer/context'
import { WMO_CODES } from '@/lib/wmo-codes'

const MAX_AGE = 30 * 60_000
const HORIZON = 2 * 60 * 60_000
const percent = z.number().finite().min(0).max(100).nullable()
const timestamp = z.number().finite().nonnegative()
export const skyEstimateSchema = z.object({
  fetchedAt: timestamp, providerReceivedAt: timestamp.nullable(),
  timezone: z.string().refine(isStargazerTimeZone),
  current: z.object({
    time: timestamp, total: percent, layers: z.tuple([percent, percent, percent]),
    isDay: z.boolean().nullable(), precipitation: z.number().finite().nonnegative().nullable(),
    weatherCode: z.number().int().nullable(), visibility: z.number().finite().nonnegative().nullable(),
  }),
  hours: z.array(z.object({ time: timestamp, total: percent })).max(3),
})
export type SkyEstimate = z.infer<typeof skyEstimateSchema>
export type SkyFrame = SkyEstimate['current']

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function validTime(value: unknown, unit: unknown): number | null {
  return unit === 'unixtime' && typeof value === 'number' && Number.isSafeInteger(value) && value > 0 &&
    Number.isFinite(new Date(value * 1000).getTime()) ? value * 1000 : null
}

/** A receipt is not a model run. Validate both receipt age and current valid time. */
export function isSkyFresh(estimate: SkyEstimate, now: number): boolean {
  return [estimate.fetchedAt, estimate.current.time, estimate.providerReceivedAt ?? estimate.fetchedAt]
    .every(time => Number.isFinite(now) && time <= now && now - time <= MAX_AGE)
}

/** Narrow provider boundary: unknown values and missing units never become zero. */
export function readSkyEstimate(body: unknown, fetchedAt: number, providerReceivedAt: number | null): SkyEstimate | null {
  const data = record(body)
  const timezone = typeof data.timezone === 'string' ? data.timezone : null
  if (!isStargazerTimeZone(timezone)) return null
  const current = record(data.current)
  const units = record(data.current_units)
  const time = validTime(current.time, units.time)
  if (time === null) return null
  const value = (key: string, unit: string, max = Infinity): number | null => {
    const raw = current[key]
    return units[key] === unit && typeof raw === 'number' && Number.isFinite(raw) && raw >= 0 && raw <= max ? raw : null
  }
  const total = value('cloud_cover', '%', 100)
  const layers: SkyFrame['layers'] = [value('cloud_cover_low', '%', 100), value('cloud_cover_mid', '%', 100), value('cloud_cover_high', '%', 100)]
  if (total === null && layers.every(layer => layer === null)) return null
  if (total === 0 && layers.some(layer => layer !== null && layer > 0)) return null
  const day = value('is_day', '', 1)
  const code = value('weather_code', 'wmo code')
  const hourly = record(data.hourly)
  const hourlyUnits = record(data.hourly_units)
  const times = Array.isArray(hourly.time) ? hourly.time : []
  const totals = Array.isArray(hourly.cloud_cover) ? hourly.cloud_cover : []
  const stamps = times.map(raw => validTime(raw, hourlyUnits.time))
  const validStamps = stamps.filter((stamp): stamp is number => stamp !== null)
  const ordered = validStamps.every((stamp, index) => index === 0 || stamp > validStamps[index - 1])
  const hours: SkyEstimate['hours'] = []
  if (ordered && hourlyUnits.cloud_cover === '%') stamps.forEach((stamp, index) => {
    const raw = totals[index]
    if (stamp !== null && stamp > fetchedAt && stamp <= fetchedAt + HORIZON && typeof raw === 'number' && Number.isFinite(raw) && raw >= 0 && raw <= 100) hours.push({ time: stamp, total: raw })
  })
  const estimate: SkyEstimate = {
    fetchedAt, providerReceivedAt, timezone,
    current: { time, total, layers, isDay: day === 0 ? false : day === 1 ? true : null,
      precipitation: value('precipitation', 'mm'), visibility: value('visibility', 'm'),
      weatherCode: code !== null && Number.isInteger(code) && Object.hasOwn(WMO_CODES, code) ? code : null },
    hours: hours.slice(0, 3),
  }
  return isSkyFresh(estimate, fetchedAt) ? estimate : null
}

export function formatSkyTime(time: number, timezone: string): string {
  return formatObservingTime(time, timezone)
}

export interface SkyReading { title: string; description: string; tip: string }

/** Reviewed conditional prose: coverage cannot identify a genus or cloud base. */
export function describeSky(frame: SkyFrame): SkyReading {
  const { total, layers, isDay } = frame
  const known = layers.map((value, index) => ({ value, name: ['low', 'middle', 'high'][index] })).filter(item => item.value !== null)
  const cloudy = known.filter(item => item.value! >= 20)
  const strongest = known.reduce<typeof known[number] | null>((best, item) => best === null || item.value! > best.value! ? item : best, null)
  const dominantNames = known.filter(item => item.value === strongest?.value).map(item => item.name).join(' and ')
  const missing = known.length < 3
  let title = total === null ? 'Cloud layers in the estimate' : total <= 10 ? 'Little cloud to read right now' : total >= 85 ? 'Cloud cover across most of the sky' : 'Some cloud, with gaps between'
  let description = total === null ? 'Overall cloud coverage is unavailable.' : total === 0 ? 'No cloud is shown in this estimate.' : `Cloud cover is estimated at ${Math.round(total)}%.`
  if (cloudy.length > 1 && (total === null || total > 10)) title = 'Clouds at more than one height'
  if (strongest !== null && strongest.value! > 0) {
    description += ` ${missing ? 'Among the available layers, the most' : 'The most'} cloud is estimated at ${dominantNames} levels.`
    if (cloudy.length > 1) description += ' Cloud layers can overlap and hide those above.'
  }
  if (missing) description += known.length === 0 ? ' Layer details are unavailable, so cloud heights cannot be described.' : ' Some layer details are unavailable.'
  if (frame.weatherCode === 45 || frame.weatherCode === 48) description += ' The weather model also indicates fog.'
  else if (frame.visibility !== null && frame.visibility < 1000) description += ' The model indicates reduced visibility; this alone does not identify its cause.'
  if (frame.precipitation === 0) description += ' No precipitation is indicated in the current estimate.'
  else if (frame.precipitation !== null) description += ' Precipitation is indicated separately in the current estimate.'
  if (isDay === false) description += ' Cloud shapes can be harder to distinguish after dark.'
  const tip = isDay === false
    ? 'Moonlight can sometimes reveal cloud shapes. When it is too dark to distinguish them, use the estimate as context.'
    : strongest?.name === 'low' && strongest.value! >= 50
      ? 'If you see a low, fairly uniform gray blanket, it may be stratus. A layer can remain dry or produce drizzle; the percentage alone cannot identify it.'
      : 'Compare broad layers, separate rounded patches, and thin streaks. Shape provides clues that cloud-cover percentages cannot give.'
  return { title, description, tip }
}

export function describeSkyOutlook(estimate: SkyEstimate, now: number): { text: string; hours: SkyEstimate['hours'] } {
  const hours = estimate.hours.filter(hour => hour.time > now && hour.time <= now + HORIZON && hour.total !== null)
  const last = hours.at(-1)
  if (!last) return { text: 'We have your current sky estimate, but the two-hour cloud outlook is unavailable.', hours }
  const end = formatSkyTime(last.time, estimate.timezone)
  const values = [estimate.current.total, ...hours.map(hour => hour.total)].filter((value): value is number => value !== null)
  const change = estimate.current.total === null ? null : last.total! - estimate.current.total
  const direction = change === null ? `Cloud cover is forecast at ${Math.round(last.total!)}%` : Math.max(...values) - Math.min(...values) < 15
    ? 'Cloud coverage is forecast to stay broadly similar' : change >= 15 ? 'More cloud cover is forecast' : change <= -15 ? 'Less cloud cover is forecast' : 'Cloud coverage may vary, then return to a similar amount'
  return { text: `${direction} by ${end}. These are hourly estimates, not an exact time for a change.${hours.length < 2 ? ' Only part of the two-hour outlook is available.' : ''}`, hours }
}
