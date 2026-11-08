/** @jest-environment node */
jest.mock('@/lib/services/swpc-proxy', () => ({ fetchSwpcJson: jest.fn() }))
jest.mock('@/lib/error-utils', () => ({ logRouteError: jest.fn() }))
jest.mock('@/lib/services/weather-rate-limiter', () => ({ rateLimitRequest: jest.fn().mockResolvedValue({ allowed: true, headers: {} }) }))
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/space-weather/scales/route'
import { fetchSwpcJson } from '@/lib/services/swpc-proxy'

it.each([undefined, '', 'invalid', '0oops', '6'])('does not invent quiet scales when upstream scale is %s', async (scale) => {
  jest.mocked(fetchSwpcJson).mockResolvedValue({ '0': { R: { Scale: scale }, S: { Scale: '0' }, G: { Scale: '0' } } })
  const response = await GET(new NextRequest('http://localhost/api/space-weather/scales'))
  expect(response.ok).toBe(false)
  expect((await response.json()).error).toBeDefined()
})
