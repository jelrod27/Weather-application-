/** @jest-environment node */
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/weather/pollen/route'
import { getClientIdentifier } from '@/lib/services/weather-rate-limiter'
import { getServerUser } from '@/lib/supabase/server'
import { fetchWithTimeout } from '@/lib/fetch-with-timeout'

jest.mock('@/lib/supabase/server', () => ({ getServerUser: jest.fn() }))
jest.mock('@/lib/fetch-with-timeout', () => ({ fetchWithTimeout: jest.fn() }))
jest.mock('@/lib/open-meteo', () => ({ fetchOpenMeteoAirQuality: jest.fn() }))

it('characterizes the Pollen identity boundary with at most 100 offline requests', async () => {
  const originalKey = process.env.GOOGLE_POLLEN_API_KEY
  process.env.GOOGLE_POLLEN_API_KEY = 'dummy-offline-key'
  jest.mocked(getServerUser).mockResolvedValue(null)
  jest.mocked(fetchWithTimeout).mockImplementation(async () => Response.json({
    dailyInfo: [{ pollenTypeInfo: [{ code: 'TREE', indexInfo: { value: 1, category: 'Low' } }] }],
  }))
  const request = (ip: string, index: number) => new NextRequest(`https://example.invalid/api/weather/pollen?lat=${40 + index / 1000}&lon=-100`, { headers: { 'x-forwarded-for': ip } })
  try {
    const statuses: number[] = []
    for (let i = 0; i < 94; i++) statuses.push((await GET(request('192.0.2.1', i))).status)
    expect(statuses.slice(0, 90)).toEqual(Array(90).fill(200))
    expect(statuses.slice(90)).toEqual([429, 429, 429, 429])
    expect(fetchWithTimeout).toHaveBeenCalledTimes(90)

    for (const [i, ip] of ['192.0.2.2', '192.0.2.3'].entries()) {
      expect(await getClientIdentifier(request(ip, i))).toBe(`ip:${ip}`)
      expect((await GET(request(ip, i))).status).toBe(200)
    }

    jest.mocked(getServerUser).mockResolvedValue({ id: 'dummy-user' } as never)
    for (const ip of ['192.0.2.4', '192.0.2.5']) {
      expect(await getClientIdentifier(request(ip, 0))).toBe('user:dummy-user')
      expect((await GET(request(ip, 0))).status).toBe(200)
    }
    // Same-query controls reach the dummy provider seam. This harness has no
    // CDN and cannot characterize platform caching or actual billable usage.
    jest.mocked(getServerUser).mockResolvedValue(null)
    for (let i = 0; i < 2; i++) {
      const result = await GET(request('192.0.2.6', 0))
      expect(result.status).toBe(200)
      expect(result.headers.get('Cache-Control')).toContain('s-maxage=3600')
    }
    expect(fetchWithTimeout).toHaveBeenCalledTimes(96)
    expect(jest.mocked(fetchWithTimeout).mock.calls.every(([url]) => String(url).startsWith('https://pollen.googleapis.com/'))).toBe(true)
  } finally {
    if (originalKey === undefined) delete process.env.GOOGLE_POLLEN_API_KEY
    else process.env.GOOGLE_POLLEN_API_KEY = originalKey
  }
})
