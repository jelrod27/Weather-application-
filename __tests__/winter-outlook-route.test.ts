/** @jest-environment node */
jest.mock('@/lib/services/weather-rate-limiter', () => ({ rateLimitRequest: jest.fn().mockResolvedValue({ allowed: true, headers: { 'X-RateLimit-Remaining': '99' } }) }))
jest.mock('@/lib/error-utils', () => ({ logRouteError: jest.fn() }))
jest.mock('@/lib/winter/outlooks', () => {
  const actual = jest.requireActual('@/lib/winter/outlooks')
  return { ...actual, fetchWinterOutlook: jest.fn() }
})
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/winter/outlook/route'
import { fetchWinterOutlook } from '@/lib/winter/outlooks'
import type { WinterMapSnapshot } from '@/lib/winter/types'

const fetchMock = jest.mocked(fetchWinterOutlook)
function snapshot(): WinterMapSnapshot {
  return { selection: { product: 'ice', day: 2, threshold: 8 }, source: 'NWS WPC', sourceUrl: 'https://www.wpc.ncep.noaa.gov/',
    coverage: 'Contiguous United States', status: 'available', issuedAt: new Date().toISOString(),
    validFrom: new Date().toISOString(), validTo: new Date(Date.now() + 3_600_000).toISOString(),
    fetchedAt: new Date().toISOString(), message: null, legend: [], contours: { type: 'FeatureCollection', features: [] } }
}
beforeEach(() => jest.clearAllMocks())

it.each(['product=radar', 'day=0', 'day=4', 'day=NaN', 'day=', 'threshold=6', 'threshold=Infinity'])('rejects unsupported selection %s before fetching', async query => {
  const response = await GET(new NextRequest(`https://localhost/api/winter/outlook?${query}`))
  expect(response.status).toBe(400)
  expect(fetchMock).not.toHaveBeenCalled()
})
it('uses the validated selection and explicit public cache only for an available outlook', async () => {
  fetchMock.mockResolvedValue(snapshot())
  const response = await GET(new NextRequest('https://localhost/api/winter/outlook?product=ice&day=2&threshold=8'))
  expect(response.status).toBe(200)
  expect(fetchMock).toHaveBeenCalledWith({ product: 'ice', day: 2, threshold: 8 })
  expect(response.headers.get('cache-control')).toContain('s-maxage=300')
  expect(response.headers.get('X-RateLimit-Remaining')).toBe('99')
})
it('does not CDN-cache missing validity or stale data', async () => {
  fetchMock.mockResolvedValue({ ...snapshot(), status: 'unavailable' })
  const response = await GET(new NextRequest('https://localhost/api/winter/outlook'))
  expect(response.headers.get('cache-control')).toBe('no-store')
})
it('returns a distinct upstream failure rather than an empty map', async () => {
  fetchMock.mockRejectedValue(new Error('private upstream details'))
  const response = await GET(new NextRequest('https://localhost/api/winter/outlook'))
  expect(response.status).toBe(502)
  expect(response.headers.get('cache-control')).toBe('no-store')
  expect(JSON.stringify(await response.json())).not.toContain('private upstream details')
})

it('caps CDN caching before the exact source expiry', async () => {
  jest.useFakeTimers({ now: Date.parse('2026-11-14T17:00:00Z') })
  try {
    fetchMock.mockResolvedValue({ ...snapshot(), validTo: new Date(Date.now() + 20_000).toISOString() })
    const response = await GET(new NextRequest('https://localhost/api/winter/outlook'))
    expect(response.headers.get('cache-control')).toBe('public, s-maxage=20')
  } finally { jest.useRealTimers() }
})
