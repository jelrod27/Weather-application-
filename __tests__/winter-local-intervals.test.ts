/** @jest-environment node */
import { normalizeAccumulation, normalizeForecastPeriods } from '@/lib/winter/local-normalize'

const NOW = Date.parse('2026-11-14T03:00:00Z')
const END = Date.parse('2026-11-14T18:00:00Z')
const block = (start: string, value: number | null, duration = 'PT6H') => ({ validTime: `2026-11-14T${start}:00:00Z/${duration}`, value })
const layer = (values: unknown[], uom = 'wmoUnit:mm') => ({ uom, values })

describe('source accumulation semantics', () => {
  it('counts six-hour blocks once and bounds the total to fully future blocks', () => {
    const result = normalizeAccumulation(layer([block('00', 25.4), block('06', 50.8), block('12', 0)]), NOW, END)
    expect(result.blocks).toEqual([
      { startTime: '2026-11-14T00:00:00.000Z', endTime: '2026-11-14T06:00:00.000Z', inches: 1, ongoing: true },
      { startTime: '2026-11-14T06:00:00.000Z', endTime: '2026-11-14T12:00:00.000Z', inches: 2, ongoing: false },
      { startTime: '2026-11-14T12:00:00.000Z', endTime: '2026-11-14T18:00:00.000Z', inches: 0, ongoing: false },
    ])
    expect(result.total).toEqual({ inches: 2, startTime: '2026-11-14T06:00:00.000Z', endTime: '2026-11-14T18:00:00.000Z', includedPeriods: 2, complete: false })
  })

  it('does not prorate a block crossing the end boundary or include expired blocks', () => {
    const result = normalizeAccumulation(layer([block('00', 25.4), block('06', 25.4), block('12', 50.8)]), Date.parse('2026-11-14T06:00Z'), Date.parse('2026-11-14T15:00Z'))
    expect(result.blocks).toHaveLength(2)
    expect(result.total.inches).toBe(1)
    expect(result.total.endTime).toBe('2026-11-14T12:00:00.000Z')
    expect(result.total.complete).toBe(false)
  })

  it('preserves unknown blocks and missing tails instead of filling zero', () => {
    const result = normalizeAccumulation(layer([block('06', null), block('12', 0)]), Date.parse('2026-11-14T06:00Z'), Date.parse('2026-11-15T00:00Z'))
    expect(result.blocks[0].inches).toBeNull()
    expect(result.total.inches).toBe(0)
    expect(result.total.complete).toBe(false)
    expect(result.status).toBe('partial')
    expect(result.issues.length).toBeGreaterThan(0)
  })

  it('excludes every ambiguously overlapping block from totals', () => {
    const result = normalizeAccumulation(layer([block('06', 25.4), block('09', 50.8), block('15', 76.2, 'PT3H')]), Date.parse('2026-11-14T06:00Z'), END)
    expect(result.total.inches).toBeCloseTo(3)
    expect(result.total.includedPeriods).toBe(1)
    expect(result.total.complete).toBe(false)
    expect(result.issues.join(' ')).toMatch(/overlap/i)
  })

  it.each([undefined, { values: [block('06', 0)] }, layer([block('06', 25.4)], 'wmoUnit:kg_m-2'), layer([block('06', null)])])('keeps missing data and unsupported units unknown: %p', (input) => {
    const result = normalizeAccumulation(input, NOW, END)
    expect(result.total.inches).toBeNull()
    expect(result.status).toBe('unavailable')
  })

  it('converts nonzero ice and validates malformed or negative source amounts', () => {
    const result = normalizeAccumulation(layer([block('06', 2.54), block('12', -1), { validTime: 'bad/PT6H', value: 10 }]), Date.parse('2026-11-14T06:00Z'), END)
    expect(result.blocks[0].inches).toBeCloseTo(0.1)
    expect(result.blocks[1].inches).toBeNull()
    expect(result.total.inches).toBeCloseTo(0.1)
    expect(result.total.complete).toBe(false)
  })

  it('keeps compressed source durations intact and recognizes complete known coverage', () => {
    const result = normalizeAccumulation(layer([block('06', 0, 'PT12H')]), Date.parse('2026-11-14T06:00Z'), END)
    expect(result.blocks).toHaveLength(1)
    expect(result.total).toMatchObject({ inches: 0, includedPeriods: 1, complete: true })
    expect(result.status).toBe('available')
  })

  it('preserves absolute boundaries across the fall daylight-saving change', () => {
    const result = normalizeAccumulation(layer([{ validTime: '2026-11-01T00:00:00-06:00/PT6H', value: 25.4 }]), Date.parse('2026-11-01T06:00Z'), Date.parse('2026-11-01T12:00Z'))
    expect(result.total).toMatchObject({ inches: 1, startTime: '2026-11-01T06:00:00.000Z', endTime: '2026-11-01T12:00:00.000Z', complete: true })
  })
})

describe('source-written forecast periods', () => {
  it('retains the narrative range as text and precipitation as probability of any precipitation', () => {
    const result = normalizeForecastPeriods({ properties: { periods: [{ name: 'Tonight', startTime: '2026-11-14T00:00:00-06:00', endTime: '2026-11-14T12:00:00-06:00', temperature: -5, temperatureUnit: 'C', windSpeed: '10 to 20 mph', windDirection: 'NW', probabilityOfPrecipitation: { unitCode: 'wmoUnit:percent', value: 70 }, shortForecast: 'Snow and freezing rain', detailedForecast: 'Snow accumulation of 3 to 5 inches possible.' }] } }, Date.parse('2026-11-14T06:00Z'), END)
    expect(result[0]).toMatchObject({ temperatureF: 23, precipitationProbability: 70, shortForecast: 'Snow and freezing rain', detailedForecast: 'Snow accumulation of 3 to 5 inches possible.' })
    expect(result[0]).not.toHaveProperty('snowRange')
  })
})
