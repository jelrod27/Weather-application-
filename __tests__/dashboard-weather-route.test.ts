jest.mock('next/server', () => ({
  NextResponse: { json: (body: unknown, init?: { status?: number; headers?: Record<string, string> }) => ({ status: init?.status ?? 200, headers: init?.headers, json: async () => body }) },
}))
jest.mock('@/lib/api/with-api-route', () => ({ withApiRoute: (_: unknown, handler: (context: { rateLimitHeaders: Record<string, string> }) => Promise<unknown>) => handler({ rateLimitHeaders: {} }) }))
jest.mock('@/lib/dashboard-weather-service', () => ({ dashboardWeatherService: { load: jest.fn() } }))
import { GET } from '@/app/api/dashboard-weather/route'
import { dashboardWeatherService } from '@/lib/dashboard-weather-service'
import type { NextRequest } from 'next/server'
const load = jest.mocked(dashboardWeatherService.load)
const request = (query = '') => ({ url: `http://localhost/api/dashboard-weather?lat=40&lon=-74${query}` }) as NextRequest
beforeEach(() => load.mockResolvedValue({
  forecast: { latitude: 40, longitude: -74, generationtime_ms: 0, utc_offset_seconds: 0, timezone: 'UTC', timezone_abbreviation: 'UTC', elevation: 0,
    current: { time: '2026-09-26T20:00', temperature_2m: 70, weather_code: 0 } as never },
  fetchedAt: '2026-09-26T20:01:00Z', stale: false,
}))
it('keeps timestamps and missing measurements explicit', async () => {
  const result = await GET(request('&wind_unit=ms'))
  expect(await result.json()).toMatchObject({ temperature: 70, humidity: null, windSpeed: null, visibility: null, fetchedAt: '2026-09-26T20:01:00Z', observedAt: '2026-09-26T20:00:00.000Z', windUnit: 'ms', stale: false })
})
it('does not allow stale or manual refresh responses to be cached', async () => {
  const fresh = await load({ latitude: 40, longitude: -74, units: 'imperial', detail: false })
  load.mockResolvedValueOnce({ ...fresh, stale: true })
  expect((await GET(request())).headers).toMatchObject({ 'Cache-Control': 'no-store' })
  expect((await GET(request('&refresh=1'))).headers).toMatchObject({ 'Cache-Control': 'no-store' })
  expect(load).toHaveBeenLastCalledWith(expect.objectContaining({ refresh: true }))
})
it('returns 502 without upstream details on failure', async () => {
  load.mockRejectedValueOnce(new Error('Open-Meteo Forecast API error 503: private body'))
  const result = await GET(request())
  expect(result.status).toBe(502)
  expect(await result.json()).toEqual({ error: 'Weather is temporarily unavailable. Please retry.' })
})
it('rejects invalid coordinates before a provider call', async () => {
  load.mockClear()
  expect((await GET({ url: 'http://localhost/api/dashboard-weather?lat=bad&lon=1' } as NextRequest)).status).toBe(400)
  expect(load).not.toHaveBeenCalled()
})
