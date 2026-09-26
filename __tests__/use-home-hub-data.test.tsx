/**
 * useHomeHubData request pipeline.
 *
 * Each hub card fetch used to be `fetch().then(handler)` with the try/catch
 * inside the handler, so a fetch that rejected before the handler ran (a
 * navigation abort or a network failure) escaped Promise.all into the
 * effect's `void` call: an unhandled rejection in Sentry and, for network
 * failures, a card stuck on its loading state until the next refresh.
 * Sentry 16BIT-WEATHER-WEB-B and 16BIT-WEATHER-WEB-8.
 */
import { renderHook, waitFor } from '@testing-library/react'
import { useHomeHubData } from '@/hooks/use-home-hub-data'
import type { HubUserLocation } from '@/lib/home/hub-utils'

const PLEASANTON: HubUserLocation = {
  lat: 37.662544,
  lon: -121.874919,
  locationLabel: 'Pleasanton, CA',
  country: 'US',
}

function okJson(body: unknown): Response {
  return { ok: true, status: 200, json: async () => body } as unknown as Response
}

function abortError(): Error {
  const error = new Error('signal is aborted without reason')
  error.name = 'AbortError'
  return error
}

describe('useHomeHubData', () => {
  const realFetch = global.fetch

  afterEach(() => {
    global.fetch = realFetch
  })

  it('clears the stargazer card loading state when its fetch fails at the network level', async () => {
    global.fetch = jest.fn((input: RequestInfo | URL) => {
      const url = String(input)
      if (url.startsWith('/api/stargazer')) {
        return Promise.reject(new TypeError('Failed to fetch'))
      }
      return Promise.resolve(okJson({ alerts: [], happeningNow: [], pointRisk: null }))
    }) as unknown as typeof fetch

    const { result } = renderHook(() => useHomeHubData(PLEASANTON))

    await waitFor(() => expect(result.current.stargazer.loading).toBe(false))
    expect(result.current.stargazer.score).toBeNull()
    expect(result.current.loading).toBe(false)
  })

  it('preserves an unavailable stargazing score and its explanation', async () => {
    global.fetch = jest.fn(async (input: RequestInfo | URL) => okJson(
      String(input).startsWith('/api/stargazer')
        ? { score: { overall: null, label: 'Unavailable', subScores: null, color: '#9ca3af', summary: 'No astronomical darkness at this location tonight.' } }
        : { alerts: [], happeningNow: [], pointRisk: null },
    ))
    const { result } = renderHook(() => useHomeHubData(PLEASANTON))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.stargazer.score).toBeNull()
    expect(result.current.stargazer.label).toBe('Unavailable')
    expect(result.current.stargazer.summary).toMatch(/No astronomical darkness/)
  })

  it('does not leak an unhandled rejection when unmounted while requests are in flight', async () => {
    const unhandled = jest.fn()
    process.on('unhandledRejection', unhandled)

    global.fetch = jest.fn((_input: RequestInfo | URL, init?: RequestInit) => {
      return new Promise<Response>((_, reject) => {
        init?.signal?.addEventListener('abort', () => reject(abortError()))
      })
    }) as unknown as typeof fetch

    const { unmount } = renderHook(() => useHomeHubData(PLEASANTON))
    unmount()

    // Let the rejected chains settle and Node report anything unhandled.
    await new Promise((resolve) => setTimeout(resolve, 20))
    process.off('unhandledRejection', unhandled)

    expect(unhandled).not.toHaveBeenCalled()
  })
})

it('reports unsupported coverage for an international city instead of no warnings', async () => {
  const realFetch = global.fetch
  global.fetch = jest.fn().mockResolvedValue(okJson({ alerts: [], coverage: 'outside-nws', happeningNow: [] }))
  try {
    const { result } = renderHook(() => useHomeHubData({ lat: 51.5, lon: -0.12, country: 'GB', locationLabel: 'London' }))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.alerts.coverage).toBe('outside-nws')
    expect(result.current.alerts.count).toBeNull()
  } finally { global.fetch = realFetch }
})

it('keeps a point-feed warning nearby when its polygon excludes the viewed city', async () => {
  const realFetch = global.fetch
  const warning = { id: 'nearby', warningEventId: 'event', event: 'Tornado Warning', severity: 'Severe', urgency: 'Immediate', expires: '2099-01-01',
    geometry: { type: 'Polygon', coordinates: [[[-121.7, 37.6], [-121.6, 37.6], [-121.6, 37.7], [-121.7, 37.7], [-121.7, 37.6]]] } }
  global.fetch = jest.fn().mockResolvedValue(okJson({ alerts: [warning], happeningNow: [] }))
  try {
    const { result } = renderHook(() => useHomeHubData(PLEASANTON))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.alerts.count).toBe(0)
    expect(result.current.alerts.nearbyCount).toBe(1)
  } finally { global.fetch = realFetch }
})

it('counts one event when the national snapshot and local feed carry different updates', async () => {
  const realFetch = global.fetch
  const base = { warningEventId: 'same-event', event: 'Tornado Warning', severity: 'Severe', urgency: 'Immediate', expires: '2099-01-01',
    geometry: { type: 'Polygon', coordinates: [[[-122, 37.5], [-121.7, 37.5], [-121.7, 37.8], [-122, 37.8], [-122, 37.5]]] } }
  global.fetch = jest.fn(async (url) => okJson({ alerts: String(url).includes('point=')
    ? [{ ...base, id: 'new', sent: '2026-09-25T12:00:00Z' }]
    : [{ ...base, id: 'old', sent: '2026-09-25T11:00:00Z' }], happeningNow: [] }))
  try {
    const { result } = renderHook(() => useHomeHubData(PLEASANTON))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.alerts.count).toBe(1)
    expect(result.current.alerts.topAlertId).toBe('new')
  } finally { global.fetch = realFetch }
})

it('does not promote another segment when the point feed confirms only one segment', async () => {
  const realFetch = global.fetch
  const a = { id: 'a', warningEventId: 'shared', ugc: ['COC001'], geometry: null, event: 'Tornado Warning', severity: 'Severe', urgency: 'Immediate', expires: '2099-01-01' }
  const b = { ...a, id: 'b', ugc: ['COC003'] }
  global.fetch = jest.fn(async (url) => okJson({ alerts: String(url).includes('point=') ? [a] : [a, b], happeningNow: [] }))
  try {
    const { result } = renderHook(() => useHomeHubData(PLEASANTON))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.alerts.count).toBe(1)
    expect(result.current.alerts.topAlertId).toBe('a')
  } finally { global.fetch = realFetch }
})
