/** @jest-environment node */
jest.mock('@/lib/fetch-with-timeout', () => ({ fetchWithTimeout: jest.fn() }))
jest.mock('@/lib/error-utils', () => ({ logRouteError: jest.fn() }))
jest.mock('@/lib/services/weather-rate-limiter', () => ({
  rateLimitRequest: jest.fn().mockResolvedValue({ allowed: true, headers: {} }),
}))

import { NextRequest } from 'next/server'
import { GET } from '@/app/api/space-weather/flares/route'
import { fetchWithTimeout } from '@/lib/fetch-with-timeout'

const fetchMock = jest.mocked(fetchWithTimeout)
const flare = {
  flrID: '2026-11-05T18:21:00-FLR-001', instruments: [{ displayName: 'GOES-P: EXIS 1.0-8.0' }],
  beginTime: '2026-11-05T18:21Z', peakTime: '2026-11-05T18:33Z', endTime: null,
  classType: 'M3.5', sourceLocation: 'S08E35', activeRegionNum: 14566,
  linkedEvents: [{ activityID: '2026-11-05T20:00:00-CME-001' }],
}
const request = () => new NextRequest('http://localhost/api/space-weather/flares')

describe('NASA flare catalog route', () => {
  const previousKey = process.env.NASA_API_KEY
  beforeEach(() => { delete process.env.NASA_API_KEY; jest.clearAllMocks() })
  afterAll(() => {
    if (previousKey === undefined) delete process.env.NASA_API_KEY
    else process.env.NASA_API_KEY = previousKey
  })

  it('loads the public migrated DONKI catalog without a gateway API key', async () => {
    fetchMock.mockImplementation(async (input) => {
      const url = new URL(String(input))
      return url.origin === 'https://ccmc.gsfc.nasa.gov' && url.pathname === '/DONKI-API/get/FLR' && !url.searchParams.has('api_key')
        ? Response.json([flare]) : new Response(null, { status: 503 })
    })
    const response = await GET(request())
    const body = await response.json()
    expect(response.status).toBe(200)
    expect(body.events[0]).toMatchObject({ classification: 'M3.5', linkedCME: true, endTime: flare.peakTime })
    expect(body.summary).toMatchObject({ total: 1, strongestFlare: 'M3.5', withCME: 1 })
  })

  it.each([503, 429])('reports upstream HTTP %s as unavailable, not a zero-event success', async (status) => {
    fetchMock.mockResolvedValue(new Response(null, { status }))
    const response = await GET(request())
    expect(response.status).toBe(502)
    expect((await response.json()).error).toMatch(/unavailable/i)
  })

  it('reports a timeout as unavailable', async () => {
    fetchMock.mockRejectedValue(new DOMException('Timed out', 'TimeoutError'))
    const response = await GET(request())
    expect(response.status).toBe(502)
    expect((await response.json()).error).toMatch(/unavailable/i)
  })

  it.each([{}, [null], [{ ...flare, peakTime: 'invalid' }]])('rejects malformed catalog payload %#', async (payload) => {
    fetchMock.mockResolvedValue(Response.json(payload))
    const response = await GET(request())
    expect(response.status).toBe(502)
    expect((await response.json()).error).toBeDefined()
  })

  it('allows a genuinely empty catalog response', async () => {
    fetchMock.mockResolvedValue(Response.json([]))
    const response = await GET(request())
    expect(response.status).toBe(200)
    expect((await response.json()).events).toEqual([])
  })
})
