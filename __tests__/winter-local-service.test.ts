/** @jest-environment node */
jest.mock('@/lib/fetch-with-timeout', () => ({ fetchWithTimeout: jest.fn() }))
import { fetchWithTimeout } from '@/lib/fetch-with-timeout'

const NOW = Date.parse('2026-11-14T06:00:00Z')
const gridUrl = 'https://api.weather.gov/gridpoints/BOU/63,62'
const points = { properties: { forecastGridData: gridUrl, forecastHourly: `${gridUrl}/forecast/hourly`, forecast: `${gridUrl}/forecast`, timeZone: 'America/Denver', relativeLocation: { properties: { city: 'Denver', state: 'CO' } } } }
const updated = '2026-11-14T05:00:00Z'
const amounts = { uom: 'wmoUnit:mm', values: [{ validTime: '2026-11-14T06:00:00Z/P3D', value: 25.4 }] }
const grid = { properties: { updateTime: updated, snowfallAmount: amounts, iceAccumulation: { ...amounts, values: [{ validTime: '2026-11-14T06:00:00Z/P3D', value: 2.54 }] } } }
const periods = Array.from({ length: 80 }, (_, index) => ({ number: index, name: 'Morning', startTime: new Date(NOW + index * 3600000).toISOString(), endTime: new Date(NOW + (index + 1) * 3600000).toISOString(), temperature: 28, temperatureUnit: 'F', windSpeed: '10 mph', windDirection: 'N', probabilityOfPrecipitation: { unitCode: 'wmoUnit:percent', value: 60 }, shortForecast: 'Snow and freezing rain', detailedForecast: 'Snow accumulation of 1 to 3 inches.' }))
const forecast = { properties: { updateTime: updated, periods } }
const fetchMock = jest.mocked(fetchWithTimeout)

async function service() { return (await import('@/lib/winter/local-forecast')).fetchLocalWinterForecast }
function respond(input: unknown): Promise<Response> {
  const url = String(input)
  return Promise.resolve(Response.json(url.includes('/points/') ? points : url.endsWith('/forecast/hourly') || url.endsWith('/forecast') ? forecast : grid))
}

beforeEach(() => {
  jest.resetModules()
  jest.useFakeTimers({ now: NOW })
  fetchMock.mockReset().mockImplementation(respond)
  // resetModules creates a fresh mocked dependency as well as fresh source caches.
  jest.doMock('@/lib/fetch-with-timeout', () => ({ fetchWithTimeout: fetchMock }))
})
afterEach(() => jest.useRealTimers())

it('discovers official grids, preserves source times and actual timezone, and bounds hourly detail to 72h', async () => {
  const fetchLocalWinterForecast = await service()
  const result = await fetchLocalWinterForecast(39.7392, -104.9903)
  expect(result).toMatchObject({ status: 'available', place: { name: 'Denver, CO', timeZone: 'America/Denver' }, gridUpdatedAt: '2026-11-14T05:00:00.000Z', fetchedAt: '2026-11-14T06:00:00.000Z' })
  expect(result.snow.total.inches).toBe(1)
  expect(result.ice.total.inches).toBeCloseTo(0.1)
  expect(result.hourly).toHaveLength(72)
  expect(result.narrative[0].detailedForecast).toBe('Snow accumulation of 1 to 3 inches.')
  await fetchLocalWinterForecast(39.7392, -104.9903)
  expect(fetchMock).toHaveBeenCalledTimes(4)
  expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('api.weather.gov/points/39.7392,-104.9903'), expect.objectContaining({ timeoutMs: expect.any(Number), redirect: 'error' }))
})

it.each([
  {},
  { properties: { ...points.properties, relativeLocation: { properties: { state: 'CO' } } } },
  { properties: { ...points.properties, relativeLocation: { properties: { city: 'Denver', state: 'XX' } } } },
  { properties: { ...points.properties, timeZone: 'Unknown/Zone' } },
])('retries invalid point metadata immediately and caches the next valid discovery: %p', async invalidPoint => {
  fetchMock.mockResolvedValueOnce(Response.json(invalidPoint))
  const fetchLocalWinterForecast = await service()
  const first = await fetchLocalWinterForecast(39, -105)
  expect(first.status).toBe('unavailable')
  const second = await fetchLocalWinterForecast(39, -105)
  expect(second).toMatchObject({ status: 'available', place: { name: 'Denver, CO', timeZone: 'America/Denver' } })
  await fetchLocalWinterForecast(39, -105)
  expect(fetchMock.mock.calls.filter(([url]) => String(url).includes('/points/'))).toHaveLength(2)
})

it('labels old grid source data stale even after a successful current fetch', async () => {
  fetchMock.mockImplementation(input => String(input) === gridUrl ? Promise.resolve(Response.json({ properties: { ...grid.properties, updateTime: '2026-11-13T10:00:00Z' } })) : respond(input))
  expect((await (await service())(39, -105)).status).toBe('stale')
})

it.each(['/forecast/hourly', '/forecast'])('labels an old retained forecast component stale even when the grid is fresh: %s', async suffix => {
  fetchMock.mockImplementation(input => String(input).endsWith(suffix) ? Promise.resolve(Response.json({ properties: { ...forecast.properties, updateTime: '2026-11-13T10:00:00Z' } })) : respond(input))
  const result = await (await service())(39, -105)
  expect(result.status).toBe('stale')
  expect(result.gridUpdatedAt).toBe('2026-11-14T05:00:00.000Z')
  expect(result.message).toMatch(/older than 18 hours/i)
})

it.each([[61.2, -149.9], [21.3, -157.8], [51.5, -0.1]])('rejects outside-CONUS coordinates without contacting NWS (%p,%p)', async (lat, lon) => {
  const result = await (await service())(lat, lon)
  expect(result).toMatchObject({ status: 'outside_coverage', coverage: 'unsupported', hourly: [] })
  expect(result.snow.total.inches).toBeNull()
  expect(fetchMock).not.toHaveBeenCalled()
})

it('distinguishes an unsupported NWS point from a failed request', async () => {
  fetchMock.mockResolvedValue(new Response('', { status: 404 }))
  expect((await (await service())(49.1, -100)).status).toBe('outside_coverage')
})

it('keeps hourly and narrative forecasts if the raw grid fails', async () => {
  fetchMock.mockImplementation(input => String(input) === gridUrl ? Promise.resolve(new Response('', { status: 503 })) : respond(input))
  const result = await (await service())(39, -105)
  expect(result.status).toBe('partial')
  expect(result.snow.total.inches).toBeNull()
  expect(result.hourly).toHaveLength(72)
  expect(result.narrative).not.toHaveLength(0)
})

it('keeps accumulation when hourly fails independently', async () => {
  fetchMock.mockImplementation(input => String(input).endsWith('/hourly') ? Promise.reject(new Error('network')) : respond(input))
  const result = await (await service())(39, -105)
  expect(result.status).toBe('partial')
  expect(result.snow.total.inches).toBe(1)
  expect(result.hourly).toEqual([])
})

it('labels truncated hourly coverage partial even when accumulation covers the full horizon', async () => {
  fetchMock.mockImplementation(input => String(input).endsWith('/hourly') ? Promise.resolve(Response.json({ properties: { ...forecast.properties, periods: periods.slice(0, 2) } })) : respond(input))
  const result = await (await service())(39, -105)
  expect(result.snow.total.complete).toBe(true)
  expect(result.hourly).toHaveLength(2)
  expect(result.status).toBe('partial')
})

it.each([updated, '2026-11-13T10:00:00Z'])('labels timestamp-only hourly coverage partial while retaining unknown readings, updated %s', async updateTime => {
  const emptyPeriods = periods.map(period => ({ ...period, temperature: null, windSpeed: '', windDirection: null, probabilityOfPrecipitation: { unitCode: 'wmoUnit:percent', value: null }, shortForecast: ' ', detailedForecast: '' }))
  fetchMock.mockImplementation(input => String(input).endsWith('/hourly') ? Promise.resolve(Response.json({ properties: { ...forecast.properties, updateTime, periods: emptyPeriods } })) : respond(input))
  const result = await (await service())(39, -105)
  expect(result.status).toBe('partial')
  expect(result.snow.total.complete).toBe(true)
  expect(result.hourly).toHaveLength(72)
  expect(result.hourly[0]).toMatchObject({ temperatureF: null, precipitationProbability: null })
})

it('keeps the forecast unavailable when timestamp-only hourly rows are the only returned component', async () => {
  const emptyPeriods = periods.map(({ startTime, endTime }) => ({ startTime, endTime, temperature: null, shortForecast: '', detailedForecast: '' }))
  fetchMock.mockImplementation(input => {
    if (String(input).includes('/points/')) return respond(input)
    if (String(input).endsWith('/hourly')) return Promise.resolve(Response.json({ properties: { updateTime: updated, periods: emptyPeriods } }))
    return Promise.resolve(new Response('', { status: 503 }))
  })
  const result = await (await service())(39, -105)
  expect(result.status).toBe('unavailable')
  expect(result.hourly).toHaveLength(72)
  expect(result.snow.total.inches).toBeNull()
})

it('retains usable hourly conditions when individual readings are unknown', async () => {
  fetchMock.mockImplementation(input => String(input).endsWith('/hourly') ? Promise.resolve(Response.json({ properties: { ...forecast.properties, periods: periods.map(period => ({ ...period, temperature: null, probabilityOfPrecipitation: { unitCode: 'wmoUnit:percent', value: null } })) } })) : respond(input))
  const result = await (await service())(39, -105)
  expect(result.status).toBe('available')
  expect(result.hourly[0]).toMatchObject({ temperatureF: null, precipitationProbability: null, shortForecast: 'Snow and freezing rain' })
})

it.each(['https://evil.test/gridpoints/BOU/63,62', 'https://api.weather.gov@evil.test/a', 'http://api.weather.gov/gridpoints/BOU/63,62', 'https://api.weather.gov/alerts/active', 'https://api.weather.gov/gridpoints/BOU/63,62?redirect=evil', 'https://api.weather.gov:444/gridpoints/BOU/63,62'])('never fetches unsafe discovered URLs: %s', async unsafe => {
  fetchMock.mockImplementation(input => String(input).includes('/points/') ? Promise.resolve(Response.json({ properties: { ...points.properties, forecastGridData: unsafe } })) : respond(input))
  const result = await (await service())(39, -105)
  expect(result.snow.total.inches).toBeNull()
  expect(fetchMock.mock.calls.map(call => call[0])).not.toContain(unsafe)
  expect(result.status).toBe('partial')
})

it('does not report unavailable or truncated JSON as a quiet forecast', async () => {
  fetchMock.mockResolvedValue(new Response('{"properties":', { headers: { 'Content-Type': 'application/json' } }))
  const result = await (await service())(39, -105)
  expect(result.status).toBe('unavailable')
  expect(result.snow.total.inches).toBeNull()
})

it('rejects oversized upstream responses before interpreting them', async () => {
  fetchMock.mockResolvedValue(new Response('{}', { headers: { 'Content-Length': '9000000' } }))
  expect((await (await service())(39, -105)).status).toBe('unavailable')
})

it('suppresses components lacking source creation timestamps', async () => {
  fetchMock.mockImplementation(input => String(input) === gridUrl ? Promise.resolve(Response.json({ properties: { ...grid.properties, updateTime: undefined } })) : respond(input))
  const result = await (await service())(39, -105)
  expect(result.gridUpdatedAt).toBeNull()
  expect(result.snow.total.inches).toBeNull()
  expect(result.status).toBe('partial')
})
