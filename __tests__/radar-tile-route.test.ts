/** @jest-environment node */

import { NextRequest, NextResponse } from 'next/server'
import type * as SentryModule from '@sentry/nextjs'
import type { GET } from '@/app/api/radar/tile/[...path]/route'
import type * as RateLimiterModule from '@/lib/services/weather-rate-limiter'

jest.mock('@sentry/nextjs', () => ({ captureException: jest.fn(), addBreadcrumb: jest.fn() }))
jest.mock('@/lib/services/weather-rate-limiter', () => ({
  rateLimitRequest: jest.fn(async () => ({
    allowed: true,
    headers: { 'X-RateLimit-Remaining': '1199' },
  })),
}))

const PATH = 'v2/radar/abc123/256/4/3/6/2/1_1.png'
const START = new Date('2026-11-08T12:00:00Z')
const PNG = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])

describe('radar tile proxy', () => {
  let get: typeof GET
  let sentry: typeof SentryModule
  let limiter: typeof RateLimiterModule
  let fetchMock: jest.MockedFunction<typeof fetch>
  const originalFetch = global.fetch

  function request(path = PATH): ReturnType<typeof get> {
    return get(new NextRequest(`http://localhost/api/radar/tile/${path}`), {
      params: Promise.resolve({ path: path.split('/') }),
    })
  }

  beforeEach(async () => {
    jest.resetModules()
    jest.useFakeTimers()
    jest.setSystemTime(START)
    sentry = await import('@sentry/nextjs')
    limiter = await import('@/lib/services/weather-rate-limiter')
    get = (await import('@/app/api/radar/tile/[...path]/route')).GET
    fetchMock = jest.fn()
    global.fetch = fetchMock
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    global.fetch = originalFetch
    jest.restoreAllMocks()
    jest.useRealTimers()
  })

  it('keeps a missing image failed without reporting an application defect or caching a fake tile', async () => {
    fetchMock.mockResolvedValue(new Response('Not Found', { status: 404 }))

    const response = await request()

    expect(response.status).toBe(404)
    expect(response.headers.get('content-type')).toContain('application/json')
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(response.headers.get('X-RateLimit-Remaining')).toBe('1199')
    expect(await response.json()).toEqual({ error: 'Radar tile unavailable' })
    expect(sentry.captureException).not.toHaveBeenCalled()
    expect(sentry.addBreadcrumb).toHaveBeenCalledWith(expect.objectContaining({
      category: 'radar.tile', level: 'warning',
      data: { tile: PATH, upstreamStatus: 404, staleFallback: false },
    }))

    expect((await request()).status).toBe(404)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it.each([400, 410, 429, 500])('reports unexpected upstream HTTP %i with its status and a failed response', async (status) => {
    fetchMock.mockResolvedValue(new Response('upstream details', { status }))

    const response = await request()

    expect(response.status).toBe(502)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(await response.json()).toEqual({ error: 'Failed to fetch radar tile' })
    expect(sentry.captureException).toHaveBeenCalledWith(
      expect.objectContaining({ status }),
      expect.objectContaining({ tags: { context: 'radar-tile' }, extra: expect.objectContaining({ tile: PATH, upstreamStatus: status, staleFallback: false }) }),
    )
  })

  it('keeps transport failures observable', async () => {
    const failure = new Error('connection failed')
    fetchMock.mockRejectedValue(failure)

    expect((await request()).status).toBe(502)
    expect(sentry.captureException).toHaveBeenCalledWith(failure, expect.objectContaining({ tags: { context: 'radar-tile' } }))
  })

  it('coalesces concurrent cold requests and caches the original PNG for ten minutes', async () => {
    let finish!: (response: Response) => void
    const upstream = new Promise<Response>((resolve) => { finish = resolve })
    fetchMock.mockReturnValue(upstream)
    const requests = [request(), request(), request()]
    await Promise.resolve()
    await Promise.resolve()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith(`https://tilecache.rainviewer.com/${PATH}`, expect.objectContaining({ signal: expect.any(AbortSignal) }))
    finish(new Response(PNG, { headers: { 'Content-Type': 'image/png' } }))

    for (const response of await Promise.all(requests)) {
      expect(response.status).toBe(200)
      expect(new Uint8Array(await response.arrayBuffer())).toEqual(PNG)
    }
    jest.setSystemTime(START.getTime() + 10 * 60_000)
    expect((await request()).status).toBe(200)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('shares a failed refresh, serves real cached bytes, and never extends the one-hour stale ceiling', async () => {
    fetchMock.mockResolvedValueOnce(new Response(PNG, { headers: { 'Content-Type': 'image/png' } }))
    await request()
    jest.setSystemTime(START.getTime() + 10 * 60_000 + 1)
    fetchMock.mockResolvedValue(new Response('Not Found', { status: 404 }))

    const responses = await Promise.all([request(), request()])
    expect(fetchMock).toHaveBeenCalledTimes(2)
    for (const response of responses) {
      expect(response.status).toBe(200)
      expect(new Uint8Array(await response.arrayBuffer())).toEqual(PNG)
      expect(response.headers.get('cache-control')).toBe('public, max-age=60, stale-while-revalidate=300')
    }
    expect(sentry.addBreadcrumb).toHaveBeenCalledWith(expect.objectContaining({
      data: { tile: PATH, upstreamStatus: 404, staleFallback: true },
    }))
    expect(sentry.captureException).not.toHaveBeenCalled()

    jest.setSystemTime(START.getTime() + 60 * 60_000)
    expect((await request()).status).toBe(200)
    jest.setSystemTime(START.getTime() + 60 * 60_000 + 1)
    expect((await request()).status).toBe(404)
    expect(fetchMock).toHaveBeenCalledTimes(4)

    fetchMock.mockResolvedValueOnce(new Response(PNG))
    expect((await request()).status).toBe(200)
    expect(fetchMock).toHaveBeenCalledTimes(5)
  })

  it('reports unexpected upstream failures even when stale imagery can be served', async () => {
    fetchMock.mockResolvedValueOnce(new Response(PNG))
    await request()
    jest.setSystemTime(START.getTime() + 10 * 60_000 + 1)
    fetchMock.mockResolvedValueOnce(new Response('unavailable', { status: 500 }))

    const response = await request()

    expect(response.status).toBe(200)
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(PNG)
    expect(sentry.captureException).toHaveBeenCalledWith(expect.objectContaining({ status: 500 }), expect.objectContaining({
      extra: expect.objectContaining({ upstreamStatus: 500, staleFallback: true }),
    }))
  })

  it('rejects paths outside the allowlist without contacting the upstream', async () => {
    const response = await request('https://example.com/private')
    expect(response.status).toBe(400)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('uses the tile quota and preserves a rate-limit rejection before fetching', async () => {
    const blocked = NextResponse.json({ error: 'Too Many Requests' }, { status: 429, headers: { 'Retry-After': '60' } })
    jest.mocked(limiter.rateLimitRequest).mockResolvedValueOnce({ allowed: false, response: blocked })

    const response = await request()

    expect(response.status).toBe(429)
    expect(response.headers.get('Retry-After')).toBe('60')
    expect(limiter.rateLimitRequest).toHaveBeenCalledWith(expect.anything(), 'tiles')
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
