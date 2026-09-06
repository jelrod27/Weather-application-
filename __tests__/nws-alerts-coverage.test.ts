/**
 * @jest-environment node
 *
 * NWS point alerts outside NWS coverage.
 *
 * api.weather.gov answers `400 Parameter "point" is invalid: out of bounds`
 * for any pin outside its coverage (Europe, Canada, Mexico). That is our
 * input, not an upstream failure: the alerts route must not call NWS for
 * pins the coverage check rejects, must turn an NWS out-of-bounds 400 into
 * an empty 200 with a coverage flag, and must not open a Sentry issue.
 * Sentry 16BIT-WEATHER-WEB-7.
 */

jest.mock('@sentry/nextjs', () => ({
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  addBreadcrumb: jest.fn(),
}))

jest.mock('next/server', () => ({
  NextRequest: class MockNextRequest {
    url: string
    nextUrl: { pathname: string; searchParams: URLSearchParams }
    constructor(url: string) {
      this.url = url
      this.nextUrl = { pathname: new URL(url).pathname, searchParams: new URL(url).searchParams }
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
  rateLimitRequest: jest.fn().mockResolvedValue({ allowed: true, headers: {} }),
}))

jest.mock('@/lib/bitwatch/ingest', () => ({
  loadCanonicalActiveAlerts: jest.fn(),
}))

jest.mock('@/lib/supabase/service-role-client', () => ({
  createServiceRoleSupabaseClient: jest.fn(() => null),
}))

jest.mock('@/lib/services/nws-alerts-service', () => ({
  ...jest.requireActual('@/lib/services/nws-alerts-service'),
  fetchActiveAlertsDetail: jest.fn(),
  fetchHarmWarningAlerts: jest.fn(),
}))

import * as Sentry from '@sentry/nextjs'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/weather/alerts/route'
import {
  fetchActiveAlertsDetail,
  NwsPointOutOfBoundsError,
} from '@/lib/services/nws-alerts-service'

const actualService = jest.requireActual('@/lib/services/nws-alerts-service') as {
  fetchActiveAlertsDetail: typeof fetchActiveAlertsDetail
}

const mockedSentry = Sentry as jest.Mocked<typeof Sentry>
const mockFetchActiveAlertsDetail = fetchActiveAlertsDetail as jest.MockedFunction<
  typeof fetchActiveAlertsDetail
>

const NWS_OUT_OF_BOUNDS_BODY = {
  correlationId: '70bdbd52',
  title: 'Invalid Parameter',
  type: 'https://api.weather.gov/problems/InvalidParameter',
  status: 400,
  detail: 'Parameter "point" is invalid: out of bounds',
  instance: 'https://api.weather.gov/requests/70bdbd52',
}

function nwsResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response
}

describe('fetchActiveAlertsDetail with a point NWS rejects as out of bounds', () => {
  const realFetch = global.fetch

  afterEach(() => {
    global.fetch = realFetch
  })

  it('throws NwsPointOutOfBoundsError for the NWS out-of-bounds 400', async () => {
    global.fetch = jest.fn().mockResolvedValue(nwsResponse(400, NWS_OUT_OF_BOUNDS_BODY))

    await expect(
      actualService.fetchActiveAlertsDetail({ point: { lat: 43.6532, lon: -79.3832 } }),
    ).rejects.toBeInstanceOf(NwsPointOutOfBoundsError)
  })

  it('keeps the generic HTTP error for any other NWS 400', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      nwsResponse(400, { ...NWS_OUT_OF_BOUNDS_BODY, detail: 'Parameter "status" is invalid' }),
    )

    await expect(
      actualService.fetchActiveAlertsDetail({ point: { lat: 43.6532, lon: -79.3832 } }),
    ).rejects.toThrow('NWS alerts HTTP 400')
  })
})

describe('GET /api/weather/alerts with a pin outside NWS coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('answers an empty 200 with a coverage flag without calling NWS for a European pin', async () => {
    const res = await GET(
      new NextRequest('http://localhost/api/weather/alerts?harm=1&detail=1&point=52.99583,6.63056'),
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.alerts).toEqual([])
    expect(body.total).toBe(0)
    expect(body.coverage).toBe('outside-nws')
    expect(mockFetchActiveAlertsDetail).not.toHaveBeenCalled()
    expect(mockedSentry.captureException).not.toHaveBeenCalled()
  })

  it('answers an empty 200 with a coverage flag when NWS itself says out of bounds', async () => {
    mockFetchActiveAlertsDetail.mockRejectedValueOnce(new NwsPointOutOfBoundsError())

    const res = await GET(
      new NextRequest('http://localhost/api/weather/alerts?geojson=1&point=43.6532,-79.3832'),
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.type).toBe('FeatureCollection')
    expect(body.features).toEqual([])
    expect(body.coverage).toBe('outside-nws')
    expect(mockedSentry.captureException).not.toHaveBeenCalled()
  })

  it('still calls NWS for a US pin', async () => {
    mockFetchActiveAlertsDetail.mockResolvedValueOnce([])

    const res = await GET(
      new NextRequest('http://localhost/api/weather/alerts?detail=1&point=37.662544,-121.874919'),
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.coverage).toBeUndefined()
    expect(mockFetchActiveAlertsDetail).toHaveBeenCalledWith({
      point: { lat: 37.662544, lon: -121.874919 },
    })
  })
})
