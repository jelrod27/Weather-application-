import { renderHook, waitFor } from '@testing-library/react'
import { useWarningsDesk } from '@/hooks/useWarningsDesk'

const params = new URLSearchParams('state=TX&event=Tornado+Warning&search=Austin')
jest.mock('next/navigation', () => ({ useSearchParams: () => params }))
jest.mock('@/hooks/use-active-pin', () => ({ useActivePinState: () => ({ pin: { lat: 51.5, lon: -.12, label: 'London' }, label: 'London', isResolving: false }) }))
const original = global.fetch
afterEach(() => { global.fetch = original })
it.each(['outside-nws', 'unavailable'] as const)('preserves %s coverage independently of an empty national list', async (coverage) => {
  global.fetch = jest.fn(async (input: RequestInfo | URL) => {
    const point = String(input).includes('point=')
    return { ok: !(point && coverage === 'unavailable'), json: async () => point ? { alerts: [], coverage } : { alerts: [], reports: [], type: 'FeatureCollection', features: [] } } as Response
  })
  const { result } = renderHook(() => useWarningsDesk())
  await waitFor(() => expect(result.current.pointCoverage).toBe(coverage))
  expect(result.current.onYou).toEqual([])
  expect(result.current.stateFilter).toBe('TX')
  expect(result.current.eventFilter).toBe('Tornado Warning')
  expect(result.current.search).toBe('Austin')
  expect(result.current.pin?.label).toBe('London')
  const pointUrl = (global.fetch as jest.Mock).mock.calls.map(([url]) => String(url)).find((url) => url.includes('point='))
  expect(pointUrl).not.toContain('harm=1')
})
