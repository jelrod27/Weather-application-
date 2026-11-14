import type { WinterAccumulation, WinterAccumulationBlock, WinterNarrativePeriod } from './local-types'

export function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

export function sourceTime(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/.exec(value)
  if (!match) return null
  const [, rawYear, rawMonth, rawDay, rawHour, rawMinute, rawSecond] = match
  const year = Number(rawYear)
  const month = Number(rawMonth)
  const day = Number(rawDay)
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
  const monthDays = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  if (month < 1 || month > 12 || day < 1 || day > monthDays[month - 1] || Number(rawHour) > 23 || Number(rawMinute) > 59 || Number(rawSecond ?? 0) > 59) return null
  const time = Date.parse(value)
  return Number.isFinite(time) ? new Date(time).toISOString() : null
}

function parseInterval(value: unknown): { start: number; end: number } | null {
  if (typeof value !== 'string') return null
  const [rawStart, duration, extra] = value.split('/')
  const startTime = sourceTime(rawStart)
  const match = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/.exec(duration ?? '')
  if (!startTime || !match || extra !== undefined) return null
  const seconds = Number(match[1] ?? 0) * 86400 + Number(match[2] ?? 0) * 3600 + Number(match[3] ?? 0) * 60 + Number(match[4] ?? 0)
  if (!Number.isFinite(seconds) || seconds <= 0 || seconds > 14 * 86400) return null
  const start = Date.parse(startTime)
  return { start, end: start + seconds * 1000 }
}

/** Sum only unambiguous, fully future source periods wholly inside the requested horizon. */
export function normalizeAccumulation(input: unknown, start: number, end: number): WinterAccumulation {
  const layer = record(input)
  const issues = new Set<string>()
  const divisor = layer.uom === 'wmoUnit:mm' ? 25.4 : layer.uom === 'wmoUnit:in' ? 1 : null
  if (divisor === null) issues.add('Accumulation units are missing or unsupported.')
  const values = Array.isArray(layer.values) && layer.values.length <= 512 ? layer.values : []
  if (!values.length) issues.add('Accumulation periods are unavailable.')
  const blocks: WinterAccumulationBlock[] = []
  for (const entry of values) {
    const item = record(entry)
    const interval = parseInterval(item.validTime)
    if (!interval) { issues.add('A source accumulation interval is invalid.'); continue }
    if (interval.end <= start || interval.start >= end) continue
    const inches = divisor !== null && typeof item.value === 'number' && Number.isFinite(item.value) && item.value >= 0 ? item.value / divisor : null
    if (inches === null) issues.add('Some source accumulation amounts are unknown.')
    blocks.push({ startTime: new Date(interval.start).toISOString(), endTime: new Date(interval.end).toISOString(), inches, ongoing: interval.start < start })
  }
  blocks.sort((a, b) => a.startTime.localeCompare(b.startTime))
  const overlapping = new Set<WinterAccumulationBlock>()
  for (let i = 0; i < blocks.length; i++) {
    for (let j = i + 1; j < blocks.length && blocks[j].startTime < blocks[i].endTime; j++) {
      overlapping.add(blocks[i]); overlapping.add(blocks[j])
    }
  }
  if (overlapping.size) issues.add('Overlapping source periods are excluded from the total.')
  const included = blocks.filter(block => block.inches !== null && !overlapping.has(block) && Date.parse(block.startTime) >= start && Date.parse(block.endTime) <= end)
  if (blocks.some(block => block.ongoing || Date.parse(block.endTime) > end)) issues.add('Boundary-crossing source periods are displayed whole and excluded from the total.')
  let coveredUntil = start
  for (const block of included) {
    if (Date.parse(block.startTime) !== coveredUntil) break
    coveredUntil = Date.parse(block.endTime)
  }
  const complete = coveredUntil === end && issues.size === 0
  if (!complete) issues.add('The requested future window is only partially covered or unknown.')
  const known = blocks.some(block => block.inches !== null)
  return {
    status: !known ? 'unavailable' : complete ? 'available' : 'partial',
    blocks,
    total: {
      inches: included.length ? included.reduce((sum, block) => sum + (block.inches ?? 0), 0) : null,
      startTime: included[0]?.startTime ?? null,
      endTime: included.at(-1)?.endTime ?? null,
      includedPeriods: included.length,
      complete,
    },
    issues: [...issues],
  }
}

/** Explicit endpoint weather text preserves mixed precipitation without temperature heuristics. */
export function normalizeForecastPeriods(input: unknown, start: number, end: number): WinterNarrativePeriod[] {
  const periods = record(record(input).properties).periods
  if (!Array.isArray(periods) || periods.length > 512) return []
  const normalized: WinterNarrativePeriod[] = []
  for (const entry of periods) {
    const item = record(entry)
    const startTime = sourceTime(item.startTime)
    const endTime = sourceTime(item.endTime)
    if (!startTime || !endTime || startTime >= endTime || Date.parse(endTime) <= start || Date.parse(startTime) >= end) continue
    const temperature = typeof item.temperature === 'number' && Number.isFinite(item.temperature) ? item.temperature : null
    const pop = record(item.probabilityOfPrecipitation)
    const value = pop.value
    normalized.push({
      startTime, endTime,
      name: typeof item.name === 'string' ? item.name : '',
      shortForecast: typeof item.shortForecast === 'string' ? item.shortForecast : '',
      detailedForecast: typeof item.detailedForecast === 'string' ? item.detailedForecast : '',
      temperatureF: temperature === null ? null : item.temperatureUnit === 'F' ? temperature : item.temperatureUnit === 'C' ? temperature * 9 / 5 + 32 : null,
      windSpeed: typeof item.windSpeed === 'string' ? item.windSpeed : null,
      windDirection: typeof item.windDirection === 'string' ? item.windDirection : null,
      precipitationProbability: pop.unitCode === 'wmoUnit:percent' && typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100 ? value : null,
      ongoing: Date.parse(startTime) < start,
    })
  }
  return normalized.sort((a, b) => a.startTime.localeCompare(b.startTime))
}
