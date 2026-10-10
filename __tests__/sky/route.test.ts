jest.mock('next/server', () => ({ NextResponse: { json: (body: unknown, init?: { status?: number; headers?: Record<string, string> }) => ({ status: init?.status ?? 200, headers: init?.headers ?? {}, json: async () => body }) } }))
jest.mock('@/lib/services/weather-rate-limiter', () => ({ rateLimitRequest: jest.fn().mockResolvedValue({ allowed: true, headers: { 'X-RateLimit-Remaining': '99' } }) }))
jest.mock('@/lib/fetch-with-timeout', () => ({ fetchWithTimeout: jest.fn() }))
jest.mock('@/lib/error-utils', () => ({ logRouteError: jest.fn() }))

import { GET } from '@/app/api/read-your-sky/route'
import { fetchWithTimeout } from '@/lib/fetch-with-timeout'
import { rateLimitRequest } from '@/lib/services/weather-rate-limiter'

const fetchMock = jest.mocked(fetchWithTimeout)
const request = (params: Record<string, string>): Parameters<typeof GET>[0] => ({ nextUrl: { searchParams: new URLSearchParams(params) } }) as Parameters<typeof GET>[0]

beforeEach(() => { jest.clearAllMocks() })

describe('Read your sky API boundary', () => {
  test.each([{ lat: '91', lon: '0' }, { lat: '0junk', lon: '0' }, { lat: '', lon: '0' }, { lat: '0', lon: 'Infinity' }])('rejects malformed coordinates before calling the provider: %j', async params => {
    expect((await GET(request(params))).status).toBe(400)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  test('uses one bounded Best Match request and returns validated current/partial information', async () => {
    const now = Math.floor(Date.now() / 1000)
    fetchMock.mockResolvedValue({ ok: true, headers: new Headers(), json: async () => ({
      timezone: 'UTC', current_units: { time: 'unixtime', cloud_cover: '%' }, current: { time: now, cloud_cover: 70 },
    }) } as Response)
    const response = await GET(request({ lat: '0', lon: '0' }))
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.current.total).toBe(70)
    expect(data.current.layers).toEqual([null, null, null])
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const url = new URL(String(fetchMock.mock.calls[0][0]))
    expect(url.searchParams.get('forecast_hours')).toBe('3')
    expect(url.searchParams.get('timeformat')).toBe('unixtime')
    expect(url.searchParams.get('models')).toBeNull()
    expect(url.searchParams.get('daily')).toBeNull()
    const variables = [url.searchParams.get('current'), url.searchParams.get('hourly')].join(',').split(',')
    expect(variables.length).toBeLessThanOrEqual(10)
  })

  test('uses the established rate limit and stops before upstream work when denied', async () => {
    jest.mocked(rateLimitRequest).mockResolvedValueOnce({ allowed: false, response: { status: 429 } } as Awaited<ReturnType<typeof rateLimitRequest>>)
    expect((await GET(request({ lat: '0', lon: '0' }))).status).toBe(429)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  test('returns an unavailable response for stale data or provider failure', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, headers: new Headers(), json: async () => ({
      timezone: 'UTC', current_units: { time: 'unixtime', cloud_cover: '%' }, current: { time: Math.floor(Date.now() / 1000) - 7200, cloud_cover: 0 },
    }) } as Response)
    expect((await GET(request({ lat: '0', lon: '0' }))).status).toBe(502)
    fetchMock.mockRejectedValueOnce(new Error('provider unavailable'))
    const failed = await GET(request({ lat: '0', lon: '0' }))
    expect(failed.status).toBe(502)
    expect(await failed.json()).toEqual({ error: 'Current sky estimate unavailable' })
  })
})
