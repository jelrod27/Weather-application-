/** @jest-environment node */
jest.mock('@/lib/services/weather-rate-limiter', () => ({ rateLimitRequest: jest.fn() }))
jest.mock('@/lib/error-utils', () => ({ logRouteError: jest.fn() }))
jest.mock('@/lib/winter/local-forecast', () => ({ fetchLocalWinterForecast: jest.fn() }))
import { NextRequest, NextResponse } from 'next/server'
import { rateLimitRequest } from '@/lib/services/weather-rate-limiter'
import { fetchLocalWinterForecast } from '@/lib/winter/local-forecast'
import { GET } from '@/app/api/winter/forecast/route'

const service = jest.mocked(fetchLocalWinterForecast)
beforeEach(() => {
  jest.clearAllMocks()
  jest.mocked(rateLimitRequest).mockResolvedValue({ allowed: true, headers: { 'X-RateLimit-Remaining': '19' }, result: { allowed: true, remaining: 19, resetTime: Date.now() + 3600000, burstRemaining: 19, burstResetTime: Date.now() + 300000, limit: 400, burstLimit: 90 } })
})

it.each(['', '?lat=&lon=-105', '?lat=NaN&lon=-105', '?lat=Infinity&lon=-105', '?lat=91&lon=-105', '?lat=39&lon=-181', '?lat=0x20&lon=-105', '?lat=39foo&lon=-105', '?lat=%20&lon=-105', '?lat=39&lat=40&lon=-105', '?lat=39&lon=-105&lon=-106'])('rejects invalid coordinate input without contacting upstream: %s', async query => {
  const response = await GET(new NextRequest(`http://localhost/api/winter/forecast${query}`))
  expect(response.status).toBe(400)
  expect(await response.json()).toHaveProperty('error')
  expect(service).not.toHaveBeenCalled()
})

it('returns the forecast contract and rate-limit headers with client revalidation', async () => {
  service.mockResolvedValue({ status: 'partial', place: { name: 'Denver, CO' } } as Awaited<ReturnType<typeof fetchLocalWinterForecast>>)
  const response = await GET(new NextRequest('http://localhost/api/winter/forecast?lat=39.7392&lon=-104.9903'))
  expect(response.status).toBe(200)
  expect(await response.json()).toMatchObject({ status: 'partial', place: { name: 'Denver, CO' } })
  expect(response.headers.get('Cache-Control')).toBe('no-store')
  expect(response.headers.get('X-RateLimit-Remaining')).toBe('19')
  expect(service).toHaveBeenCalledWith(39.7392, -104.9903)
})

it('returns explicit outside coverage as a successful typed response', async () => {
  service.mockResolvedValue({ status: 'outside_coverage', coverage: 'unsupported' } as Awaited<ReturnType<typeof fetchLocalWinterForecast>>)
  const response = await GET(new NextRequest('http://localhost/api/winter/forecast?lat=61.2&lon=-149.9'))
  expect(response.status).toBe(200)
  expect(await response.json()).toMatchObject({ status: 'outside_coverage' })
})

it('returns unavailable as a 502 JSON error with revalidation and rate-limit headers', async () => {
  service.mockResolvedValue({ status: 'unavailable', snow: { total: { inches: null } } } as Awaited<ReturnType<typeof fetchLocalWinterForecast>>)
  const response = await GET(new NextRequest('http://localhost/api/winter/forecast?lat=39&lon=-105'))
  expect(response.status).toBe(502)
  expect(await response.json()).toEqual({ error: expect.any(String) })
  expect(response.headers.get('Cache-Control')).toBe('no-store')
  expect(response.headers.get('X-RateLimit-Remaining')).toBe('19')
})

it('does not expose upstream errors and uses the shared error boundary', async () => {
  service.mockRejectedValue(new Error('internal key or source body'))
  const response = await GET(new NextRequest('http://localhost/api/winter/forecast?lat=39&lon=-105'))
  expect(response.status).toBe(502)
  expect(JSON.stringify(await response.json())).not.toContain('internal key')
})

it('enforces the shared rate limit before any source loading', async () => {
  jest.mocked(rateLimitRequest).mockResolvedValue({ allowed: false, response: NextResponse.json({ error: 'Too many requests' }, { status: 429 }) })
  expect((await GET(new NextRequest('http://localhost/api/winter/forecast?lat=39&lon=-105'))).status).toBe(429)
  expect(service).not.toHaveBeenCalled()
})
