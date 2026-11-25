/** @jest-environment node */

jest.mock('@/lib/error-utils', () => ({ logRouteError: jest.fn() }))
jest.mock('@/lib/services/weather-rate-limiter', () => ({
  rateLimitRequest: jest.fn().mockResolvedValue({ allowed: true, headers: {} }),
}))

import { NextRequest } from 'next/server'
import { GET as xray } from '@/app/api/space-weather/xray-flux/route'
import { GET as aurora } from '@/app/api/space-weather/aurora/route'
import { GET as kp } from '@/app/api/space-weather/kp-index/route'
import { GET as scales } from '@/app/api/space-weather/scales/route'
import { loadCurrentFlare } from '@/lib/space-weather/xray'
import { loadCurrentKp } from '@/lib/space-weather/kp'
import { logRouteError } from '@/lib/error-utils'

const realFetch = global.fetch
const now = new Date('2026-10-10T12:05:00Z')
const xrayRows = (time_tag: string) => [{ time_tag, energy: '0.1-0.8nm', flux: 2e-6 }]
const kpRows = (time_tag: string) => [{ time_tag, Kp: 0 }]
const scalesRows = (timeTag: string) => ({ '0': {
  DateStamp: timeTag.slice(0, 10),
  TimeStamp: timeTag.slice(11, 19),
  R: { Scale: '0' }, S: { Scale: '0' }, G: { Scale: '0' },
} })

const consumers = [
  { name: 'X-ray API', rows: xrayRows, read: async () => {
    const response = await xray(new NextRequest('http://localhost/api/space-weather/xray-flux'))
    return (await response.json()).data?.current?.flux ?? null
  }, expected: 2e-6 },
  { name: 'flare page loader', rows: xrayRows, read: async () => (await loadCurrentFlare())?.flux ?? null, expected: 2e-6 },
  { name: 'aurora API', rows: kpRows, read: async () => {
    const response = await aurora(new NextRequest('http://localhost/api/space-weather/aurora'))
    return (await response.json()).kpIndex
  }, expected: 0 },
  { name: 'Kp API', rows: kpRows, read: async () => {
    const response = await kp(new NextRequest('http://localhost/api/space-weather/kp-index'))
    return (await response.json()).data.current?.value ?? null
  }, expected: 0 },
  { name: 'Kp page loader', rows: kpRows, read: async () => (await loadCurrentKp('test'))?.kp ?? null, expected: 0 },
  { name: 'scales API', rows: scalesRows, read: async () => {
    const response = await scales(new NextRequest('http://localhost/api/space-weather/scales'))
    return (await response.json()).scales?.G.scale ?? null
  }, expected: 0 },
]

beforeEach(() => jest.useFakeTimers().setSystemTime(now))
afterEach(() => { global.fetch = realFetch; jest.useRealTimers(); jest.clearAllMocks() })

describe('NOAA minute-updated Kp estimate', () => {
  const estimateRows = [
    { time_tag: '2026-10-10T12:04:00', estimated_kp: 0, kp_index: 0, kp: '0Z' },
    { time_tag: '2026-10-10T12:03:00', estimated_kp: 1.67, kp_index: 2, kp: '2M' },
    { time_tag: '2026-10-10T12:06:00', estimated_kp: 9, kp_index: 9, kp: '9Z' },
  ]

  function mockUpstream(estimate: unknown): void {
    global.fetch = jest.fn(async url => {
      if (String(url).endsWith('planetary_k_index_1m.json')) return Response.json(estimate)
      if (String(url).includes('forecast')) return Response.json([])
      // At 12:05 the most recent three-hour reading is dated 06:00, and the
      // uncached refresh still cannot supply the delayed 09:00 reading.
      return Response.json(kpRows('2026-10-10T06:00:00'))
    })
  }

  it('supplies fresh Kp to the hub, Kp API, and aurora API when both primary reads are stale', async () => {
    mockUpstream(estimateRows)

    await expect(loadCurrentKp('space-weather')).resolves.toEqual({
      kp: 0, timeTag: '2026-10-10T12:04:00.000Z', isEstimate: true,
    })
    expect(jest.mocked(global.fetch).mock.calls.map(([url]) => new URL(String(url)).pathname)).toEqual([
      '/products/noaa-planetary-k-index.json',
      '/products/noaa-planetary-k-index.json',
      '/json/planetary_k_index_1m.json',
    ])
    const kpResponse = await kp(new NextRequest('http://localhost/api/space-weather/kp-index'))
    expect(kpResponse.status).toBe(200)
    expect((await kpResponse.json()).data).toMatchObject({
      current: { value: 0, timeTag: '2026-10-10T12:04:00.000Z', isEstimate: true }, recent: [],
    })
    const auroraResponse = await aurora(new NextRequest('http://localhost/api/space-weather/aurora'))
    expect(auroraResponse.status).toBe(200)
    expect(await auroraResponse.json()).toMatchObject({ kpIndex: 0, data: { activity: 'quiet' } })
    expect(logRouteError).not.toHaveBeenCalled()
  })

  it.each([
    { time_tag: '2026-10-10T11:49:00', estimated_kp: 8 },
    { time_tag: '2026-10-10T12:06:00', estimated_kp: 8 },
    { time_tag: '2026-10-10T12:04:00', estimated_kp: null, kp_index: 0 },
  ])('keeps the current reading unavailable with an unusable estimate %j', async row => {
    mockUpstream([row])

    await expect(loadCurrentKp('space-weather')).resolves.toBeNull()
    expect(logRouteError).toHaveBeenCalledWith('space-weather', expect.any(Error))
  })
})

describe.each(consumers)('$name observation recovery', ({ rows, read, expected }) => {
  it('refreshes stale cached JSON before reporting live data unavailable', async () => {
    const requests: RequestInit[] = []
    global.fetch = jest.fn(async (url, options) => {
      if (String(url).includes('forecast')) return Response.json([])
      requests.push(options ?? {})
      const bypass = options?.cache === 'no-store' && !('next' in options)
      return Response.json(rows(bypass ? '2026-10-10T12:00:00Z' : '2026-10-09T12:00:00Z'))
    })
    expect(await read()).toBe(expected)
    expect(requests).toHaveLength(2)
  })

  it('serves fresh observations without a recovery request', async () => {
    const requests: RequestInit[] = []
    global.fetch = jest.fn(async (url, options) => {
      if (String(url).includes('forecast')) return Response.json([])
      requests.push(options ?? {})
      return Response.json(rows('2026-10-10T12:00:00Z'))
    })
    expect(await read()).toBe(expected)
    expect(requests).toHaveLength(1)
  })

  it.each(['2026-10-09T12:00:00Z', '2026-10-11T12:00:00Z', 'invalid'])(
    'stays unavailable when the refreshed observations are dated %s', async timeTag => {
      let attempts = 0
      global.fetch = jest.fn(async url => {
        if (String(url).includes('forecast') || String(url).endsWith('planetary_k_index_1m.json')) return Response.json([])
        attempts++
        return Response.json(rows(timeTag))
      })
      expect(await read()).toBeNull()
      expect(attempts).toBe(2)
    },
  )
})

describe('scales API unusable payload recovery', () => {
  it.each([null, {}, { '0': {} }])('refreshes an undated cached payload %j', async payload => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce(Response.json(payload))
      .mockResolvedValueOnce(Response.json(scalesRows('2026-10-10T12:00:00Z')))

    const response = await scales(new NextRequest('http://localhost/api/space-weather/scales'))
    expect(response.status).toBe(200)
    expect((await response.json()).scales.G.scale).toBe(0)
    expect(global.fetch).toHaveBeenCalledTimes(2)
  })

  it('returns no scales when the uncached request also fails', async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce(Response.json(scalesRows('2026-10-09T12:00:00Z')))
      .mockResolvedValueOnce(new Response(null, { status: 503 }))

    const response = await scales(new NextRequest('http://localhost/api/space-weather/scales'))
    expect(response.status).toBe(500)
    expect((await response.json()).scales).toBeNull()
    expect(global.fetch).toHaveBeenCalledTimes(2)
  })
})
