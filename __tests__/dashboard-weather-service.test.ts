import { createDashboardWeatherService } from '@/lib/dashboard-weather-service'
import type { OpenMeteoForecastResponse } from '@/lib/open-meteo-types'

const input = { latitude: 40.71, longitude: -74.01, units: 'imperial' as const, detail: false }
const forecast: OpenMeteoForecastResponse = {
  latitude: 40.71, longitude: -74.01, generationtime_ms: 0, utc_offset_seconds: -14400,
  timezone: 'America/New_York', timezone_abbreviation: 'EDT', elevation: 0,
  current: { time: '2026-09-26T16:00', interval: 900, temperature_2m: 70, weather_code: 0, relative_humidity_2m: 50, apparent_temperature: 70, is_day: 1, precipitation: 0, cloud_cover: 0, surface_pressure: 1013, wind_speed_10m: 5, wind_direction_10m: 90, wind_gusts_10m: 8, uv_index: 2 },
}

describe('dashboard weather recovery', () => {
  let clock: number
  let upstream: jest.Mock
  let service: ReturnType<typeof createDashboardWeatherService>
  beforeEach(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => {})
    clock = Date.parse('2026-09-26T20:00:00Z')
    upstream = jest.fn().mockResolvedValue(forecast)
    service = createDashboardWeatherService({ now: () => clock, fetchForecast: upstream })
  })

  afterEach(() => jest.restoreAllMocks())

  it('coalesces requests and reuses a fresh successful response', async () => {
    const [a, b] = await Promise.all([service.load(input), service.load(input)])
    expect(upstream).toHaveBeenCalledTimes(1)
    expect(a).toEqual(b)
    expect(a.stale).toBe(false)
    await service.load(input)
    expect(upstream).toHaveBeenCalledTimes(1)
  })

  it('isolates coordinates, temperature/wind units and detail horizon', async () => {
    for (const request of [
      input, { ...input, latitude: 51.5 }, { ...input, units: 'metric' as const },
      { ...input, windUnit: 'ms' as const }, { ...input, detail: true },
    ]) await service.load(request)
    expect(upstream).toHaveBeenCalledTimes(5)
    expect(upstream).toHaveBeenCalledWith(40.71, -74.01, expect.objectContaining({ windSpeedUnit: 'ms' }))
  })

  it('uses dated stale data on upstream failure without extending its lifetime', async () => {
    const first = await service.load(input)
    clock += 6 * 60_000
    upstream.mockRejectedValue(new Error('Open-Meteo Forecast API error 503'))
    const stale = await service.load(input)
    expect(stale).toMatchObject({ stale: true, fetchedAt: first.fetchedAt, forecast })
    clock += 20 * 60_000
    expect((await service.load(input)).fetchedAt).toBe(first.fetchedAt)
    clock += 5 * 60_000
    await expect(service.load(input)).rejects.toThrow('503')
  })

  it('manual refresh bypasses fresh data but does not destroy the last success', async () => {
    const first = await service.load(input)
    clock += 60_000
    upstream.mockRejectedValueOnce(new Error('Open-Meteo Forecast API error 429'))
    expect(await service.load({ ...input, refresh: true })).toMatchObject({ stale: true, fetchedAt: first.fetchedAt })
    clock += 5 * 60_000
    upstream.mockRejectedValueOnce(new Error('Open-Meteo Forecast API error 503'))
    expect(await service.load(input)).toMatchObject({ stale: true, fetchedAt: first.fetchedAt })
    upstream.mockResolvedValueOnce({ ...forecast, current: { ...forecast.current, temperature_2m: 72 } })
    expect(await service.load({ ...input, refresh: true })).toMatchObject({ stale: false, fetchedAt: new Date(clock).toISOString() })
  })

  it('does not cache a failure without a successful value; a retry can recover', async () => {
    upstream.mockRejectedValueOnce(new Error('upstream offline'))
    await expect(service.load(input)).rejects.toThrow('offline')
    expect((await service.load(input)).stale).toBe(false)
    expect(upstream).toHaveBeenCalledTimes(2)
  })

  it.each([
    { ...forecast, current: undefined },
    { ...forecast, current: { ...forecast.current, temperature_2m: null } },
    { ...forecast, current: { ...forecast.current, weather_code: Number.NaN } },
  ])('rejects unusable current conditions rather than cache invented weather', async (payload) => {
    upstream.mockResolvedValueOnce(payload)
    await expect(service.load(input)).rejects.toThrow(/current weather/i)
    expect((await service.load(input)).stale).toBe(false)
  })
})
