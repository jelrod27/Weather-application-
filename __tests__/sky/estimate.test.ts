import { describeSky, describeSkyOutlook, formatSkyTime, isSkyFresh, readSkyEstimate } from '@/lib/sky/estimate'

const NOW = Date.parse('2026-10-09T21:20:00Z')
function provider() {
  return {
    timezone: 'America/Los_Angeles',
    current_units: { time: 'unixtime', cloud_cover: '%', cloud_cover_low: '%', cloud_cover_mid: '%', cloud_cover_high: '%', is_day: '', precipitation: 'mm', weather_code: 'wmo code', visibility: 'm' },
    current: { time: (NOW - 5 * 60_000) / 1000, cloud_cover: 76, cloud_cover_low: 68, cloud_cover_mid: 12, cloud_cover_high: 42, is_day: 1, precipitation: 0, weather_code: 3, visibility: 20000 } as Record<string, unknown>,
    hourly_units: { time: 'unixtime', cloud_cover: '%' },
    hourly: { time: ['2026-10-09T21:00Z', '2026-10-09T22:00Z', '2026-10-09T23:00Z'].map(time => Date.parse(time) / 1000), cloud_cover: [76, 60, 46] },
  }
}

describe('local sky evidence', () => {
  it('keeps provider total separate from overlapping layers and selects only future hours within two hours', () => {
    const sky = readSkyEstimate(provider(), NOW, NOW)!
    expect(sky.current.total).toBe(76)
    expect(sky.current.layers).toEqual([68, 12, 42])
    expect(sky.hours.map(hour => hour.total)).toEqual([60, 46])
    const reading = describeSky(sky.current)
    expect(reading.title).toBe('Clouds at more than one height')
    expect(reading.description).toContain('No precipitation is indicated')
    expect(reading.description).not.toMatch(/stratus|cumulus|cirrus/i)
    expect(reading.tip).toContain('If you see')
    expect(describeSkyOutlook(sky, NOW).text).toContain('Less cloud cover is forecast')
  })

  it.each([null, undefined, -1, 101, NaN, Infinity, '50'])('keeps invalid or absent coverage %s unknown', value => {
    const raw = provider()
    raw.current.cloud_cover_low = value
    expect(readSkyEstimate(raw, NOW, null)!.current.layers[0]).toBeNull()
  })

  it('requires matching units and independently supported precipitation/fog evidence', () => {
    const raw = provider()
    raw.current_units.cloud_cover_low = 'fraction'
    raw.current_units.precipitation = 'inch'
    raw.current.weather_code = 999
    raw.current.visibility = 500
    const sky = readSkyEstimate(raw, NOW, null)!
    expect(sky.current.layers[0]).toBeNull()
    const reading = describeSky(sky.current)
    expect(reading.description).toContain('Some layer details are unavailable')
    expect(reading.description).toContain('does not identify its cause')
    expect(reading.description).not.toMatch(/fog|precipitation/i)
    raw.current.weather_code = 45
    expect(describeSky(readSkyEstimate(raw, NOW, null)!.current).description).toContain('indicates fog')
  })

  it('retains a current total with missing layers and outlook', () => {
    const raw = provider()
    raw.current.cloud_cover_low = null
    raw.current.cloud_cover_mid = null
    raw.current.cloud_cover_high = null
    raw.hourly.time = []
    const sky = readSkyEstimate(raw, NOW, null)!
    expect(sky.current.total).toBe(76)
    expect(describeSky(sky.current).description).toContain('Layer details are unavailable')
    expect(describeSkyOutlook(sky, NOW).text).toContain('outlook is unavailable')
    raw.current.cloud_cover = null
    expect(readSkyEstimate(raw, NOW, null)).toBeNull()
  })

  it.each([-31, 1])('rejects current time %s minutes from the visit', minutes => {
    const raw = provider()
    raw.current.time = (NOW + minutes * 60_000) / 1000
    expect(readSkyEstimate(raw, NOW, null)).toBeNull()
  })

  it('accepts exactly thirty minutes but expires both current and receipt time independently', () => {
    const raw = provider()
    raw.current.time = (NOW - 30 * 60_000) / 1000
    const sky = readSkyEstimate(raw, NOW, null)!
    expect(isSkyFresh(sky, NOW)).toBe(true)
    expect(isSkyFresh(sky, NOW + 1)).toBe(false)
    expect(readSkyEstimate(provider(), NOW, NOW - 31 * 60_000)).toBeNull()
    expect(readSkyEstimate(provider(), NOW, NOW + 1)).toBeNull()
  })

  it.each([0, null, '2026-10-09T21:15', Infinity])('rejects malformed current time %s', time => {
    const raw = provider()
    raw.current.time = time
    expect(readSkyEstimate(raw, NOW, null)).toBeNull()
  })

  it('rejects a malformed timezone or timestamp unit and duplicate/out-of-order outlook times', () => {
    const raw = provider()
    raw.timezone = 'Mars/Test'
    expect(readSkyEstimate(raw, NOW, null)).toBeNull()
    raw.timezone = 'UTC'
    raw.current_units.time = 'iso8601'
    expect(readSkyEstimate(raw, NOW, null)).toBeNull()
    raw.current_units.time = 'unixtime'
    raw.hourly.time = [NOW / 1000 + 3600, NOW / 1000 + 3600]
    expect(readSkyEstimate(raw, NOW, null)!.hours).toEqual([])
    raw.hourly.time = [NOW / 1000 + 7200, NOW / 1000 + 3600]
    expect(readSkyEstimate(raw, NOW, null)!.hours).toEqual([])
  })

  it('includes the exact two-hour edge and excludes later samples without relabeling an earlier hour', () => {
    const raw = provider()
    raw.hourly.time = [NOW / 1000, NOW / 1000 + 7200, NOW / 1000 + 7201]
    const sky = readSkyEstimate(raw, NOW, null)!
    expect(sky.hours).toHaveLength(1)
    expect(sky.hours[0].time).toBe(NOW + 7200_000)
    expect(describeSkyOutlook(sky, NOW).text).toContain(formatSkyTime(NOW + 7200_000, sky.timezone))
  })

  it('distinguishes repeated DST hours and midnight in the selected timezone', () => {
    const first = formatSkyTime(Date.parse('2026-11-01T08:30Z'), 'America/Los_Angeles')
    const second = formatSkyTime(Date.parse('2026-11-01T09:30Z'), 'America/Los_Angeles')
    expect(first).toContain('GMT-7')
    expect(second).toContain('GMT-8')
    expect(formatSkyTime(Date.parse('2026-10-10T07:30Z'), 'America/Los_Angeles')).toContain('Oct 10')
  })

  it('handles a clear night without implying visible stars and detects inconsistent clear/layer data', () => {
    const raw = provider()
    Object.assign(raw.current, { cloud_cover: 0, cloud_cover_low: 0, cloud_cover_mid: 0, cloud_cover_high: 0, is_day: 0 })
    const reading = describeSky(readSkyEstimate(raw, NOW, null)!.current)
    expect(reading.description).toContain('No cloud is shown')
    expect(reading.description).toContain('after dark')
    raw.current.cloud_cover_high = 50
    expect(readSkyEstimate(raw, NOW, null)).toBeNull()
  })

  it('does not invent a trend when the intermediate hour changes but the final amount does not', () => {
    const sky = readSkyEstimate(provider(), NOW, null)!
    sky.hours[0].total = 20
    sky.hours[1].total = 76
    expect(describeSkyOutlook(sky, NOW).text).toContain('may vary')
    sky.hours[0].total = 72
    expect(describeSkyOutlook(sky, NOW).text).toContain('broadly similar')
  })
})
