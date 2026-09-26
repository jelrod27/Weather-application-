/** @jest-environment node */
jest.mock('@/lib/services/swpc-proxy', () => ({ fetchSwpc: jest.fn() }))
jest.mock('@/lib/error-utils', () => ({ logRouteError: jest.fn() }))
jest.mock('@/lib/services/weather-rate-limiter', () => ({ rateLimitRequest: jest.fn().mockResolvedValue({ allowed: true, headers: {} }) }))
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/space-weather/aurora/route'
import { fetchSwpc } from '@/lib/services/swpc-proxy'
import { viewlineFor } from '@/lib/space-weather/kp-scale'
const fetchMock = jest.mocked(fetchSwpc)

it.each([0, 2, 3, 5, 9])('uses the shared viewline for Kp %s, including genuine zero', async (kp) => {
  fetchMock.mockResolvedValue(new Response(JSON.stringify([['time_tag', 'Kp'], ['2026-09-25 12:00:00', String(kp)]])))
  const response = await GET(new NextRequest('http://localhost/api/space-weather/aurora'))
  const body = await response.json()
  expect(response.status).toBe(200)
  expect(body.kpIndex).toBe(kp)
  expect(body.data.viewline.latitude).toBe(viewlineFor(kp)?.latitude)
})
it('does not invent activity or a latitude during an upstream outage', async () => {
  fetchMock.mockResolvedValue(new Response('', { status: 503 }))
  const response = await GET(new NextRequest('http://localhost/api/space-weather/aurora'))
  const body = await response.json()
  expect(response.status).toBe(500)
  expect(body.kpIndex).toBeNull()
  expect(body.data.viewline).toBeNull()
  expect(body.data.activity).toBe('unavailable')
})
