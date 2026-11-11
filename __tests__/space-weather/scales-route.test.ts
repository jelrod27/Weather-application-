/** @jest-environment node */
jest.mock('@/lib/services/swpc-proxy', () => ({ fetchSwpcJson: jest.fn() }))
jest.mock('@/lib/error-utils', () => ({ logRouteError: jest.fn() }))
jest.mock('@/lib/services/weather-rate-limiter', () => ({ rateLimitRequest: jest.fn().mockResolvedValue({ allowed: true, headers: {} }) }))
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/space-weather/scales/route'
import { fetchSwpcJson } from '@/lib/services/swpc-proxy'

beforeEach(() => jest.useFakeTimers().setSystemTime(new Date('2026-11-09T12:00:00Z')))
afterEach(() => jest.useRealTimers())

it.each([undefined, '', 'invalid', '0oops', '6'])('does not invent quiet scales when upstream scale is %s', async (scale) => {
  jest.mocked(fetchSwpcJson).mockResolvedValue({ '0': { DateStamp: '2026-11-09', TimeStamp: '11:59:00', R: { Scale: scale }, S: { Scale: '0' }, G: { Scale: '0' } } })
  const response = await GET(new NextRequest('http://localhost/api/space-weather/scales'))
  expect(response.ok).toBe(false)
  expect((await response.json()).error).toBeDefined()
})
