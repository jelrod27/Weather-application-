jest.mock('next/server', () => ({
  NextRequest: class MockNextRequest {
    url: string
    headers: Map<string, string>
    nextUrl: { searchParams: URLSearchParams }
    signal: AbortSignal

    constructor(url: string) {
      this.url = url
      this.headers = new Map()
      this.nextUrl = { searchParams: new URLSearchParams(new URL(url).search) }
      this.signal = new AbortController().signal
    }
  },
  NextResponse: {
    json: jest.fn((body: unknown, init?: { status?: number; headers?: Record<string, string> }) => ({
      status: init?.status || 200,
      headers: init?.headers || {},
      json: async () => body,
    })),
  },
}))

jest.mock('@/lib/services/weather-rate-limiter', () => ({
  rateLimitRequest: jest.fn().mockResolvedValue({
    allowed: true,
    headers: { 'X-RateLimit-Remaining': '99' },
  }),
}))

jest.mock('@/lib/fetch-with-timeout', () => ({
  fetchWithTimeout: jest.fn(),
}))

jest.mock('@/lib/open-meteo', () => ({
  fetchOpenMeteoAirQuality: jest.fn(),
}))

jest.mock('@/lib/error-utils', () => ({
  logRouteError: jest.fn(),
}))

import { GET } from '@/app/api/weather/pollen/route'
import { fetchWithTimeout } from '@/lib/fetch-with-timeout'
import { fetchOpenMeteoAirQuality } from '@/lib/open-meteo'
import { logRouteError } from '@/lib/error-utils'
import { NextRequest } from 'next/server'

const mockedGoogle = fetchWithTimeout as jest.MockedFunction<typeof fetchWithTimeout>
const mockedOpenMeteo = fetchOpenMeteoAirQuality as jest.MockedFunction<typeof fetchOpenMeteoAirQuality>
const mockedLog = logRouteError as jest.MockedFunction<typeof logRouteError>

const emptyCams = {
  hourly: {
    time: ['2026-08-26T12:00'],
    alder_pollen: [null],
    birch_pollen: [null],
    grass_pollen: [null],
    mugwort_pollen: [null],
    olive_pollen: [null],
    ragweed_pollen: [null],
  },
  utc_offset_seconds: -14400,
}

describe('GET /api/weather/pollen', () => {
  const originalKey = process.env.GOOGLE_POLLEN_API_KEY

  beforeEach(() => {
    jest.clearAllMocks()
    mockedOpenMeteo.mockResolvedValue(emptyCams as never)
  })

  afterAll(() => {
    if (originalKey === undefined) delete process.env.GOOGLE_POLLEN_API_KEY
    else process.env.GOOGLE_POLLEN_API_KEY = originalKey
  })

  it('uses Google pollen when the runtime secret is set and Google returns data', async () => {
    process.env.GOOGLE_POLLEN_API_KEY = 'test-pollen-key'
    mockedGoogle.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        dailyInfo: [
          {
            pollenTypeInfo: [
              { code: 'TREE', indexInfo: { value: 2, category: 'Low' } },
              { code: 'GRASS', indexInfo: { value: 3, category: 'Moderate' } },
              { code: 'WEED', indexInfo: { value: 1, category: 'Low' } },
            ],
          },
        ],
      }),
    } as never)

    const res = await GET(
      new NextRequest('http://localhost/api/weather/pollen?lat=40.71&lon=-74.01'),
    )
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.source).toBe('google')
    expect(body.tree.Tree).toBe('Low')
    expect(res.headers['X-Pollen-Google']).toBe('200')
    expect(mockedGoogle).toHaveBeenCalled()
    expect(mockedOpenMeteo).not.toHaveBeenCalled()
  })

  it('logs Google HTTP failures and falls back instead of swallowing them', async () => {
    process.env.GOOGLE_POLLEN_API_KEY = 'test-pollen-key'
    mockedGoogle.mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: async () => ({ error: { status: 'PERMISSION_DENIED' } }),
    } as never)

    const res = await GET(
      new NextRequest('http://localhost/api/weather/pollen?lat=40.71&lon=-74.01'),
    )
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.source).toBe('unavailable')
    expect(res.headers['X-Pollen-Google']).toBe('403')
    expect(mockedLog).toHaveBeenCalledWith(
      'pollen',
      expect.any(Error),
      expect.objectContaining({ googleStatus: 403, upstream: 'pollen.googleapis.com' }),
    )
  })

  it('marks Google as missing when the runtime secret is unset', async () => {
    delete process.env.GOOGLE_POLLEN_API_KEY

    const res = await GET(
      new NextRequest('http://localhost/api/weather/pollen?lat=40.71&lon=-74.01'),
    )
    const body = await res.json()

    expect(body.source).toBe('unavailable')
    expect(res.headers['X-Pollen-Google']).toBe('missing')
    expect(mockedGoogle).not.toHaveBeenCalled()
  })
})
