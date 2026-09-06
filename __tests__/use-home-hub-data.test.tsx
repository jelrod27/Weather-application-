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
