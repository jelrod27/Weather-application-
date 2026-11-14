import { act, renderHook, waitFor } from '@testing-library/react'
import { useWinterResource } from '@/hooks/use-winter-resource'
import { parseWinterPlace } from '@/hooks/use-winter-place'

const response = (value: unknown) => ({ ok: true, json: async () => value }) as Response

describe('Winter source state', () => {
  beforeEach(() => { jest.useRealTimers() })
  afterEach(() => jest.restoreAllMocks())

  it('reports initial failure as unavailable, never a successful empty result', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('offline'))
    const { result } = renderHook(() => useWinterResource<{ alerts: unknown[] }>('/alerts'))
    await waitFor(() => expect(result.current.error).toBeTruthy())
    expect(result.current.data).toBeNull()
    expect(result.current.loading).toBe(false)
  })

  it('retains same-query data as stale when a refresh fails', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce(response({ total: 3 })).mockRejectedValue(new Error('offline'))
    const { result } = renderHook(() => useWinterResource<{ total: number }>('/snow'))
    await waitFor(() => expect(result.current.data?.total).toBe(3))
    act(() => result.current.refresh())
    await waitFor(() => expect(result.current.error).toBeTruthy())
    expect(result.current.data?.total).toBe(3)
  })

  it('ignores late responses after changing the query and clears previous-place data', async () => {
    let resolveOld!: (value: Response) => void
    global.fetch = jest.fn().mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve })).mockResolvedValue(response({ place: 'New' }))
    const { result, rerender } = renderHook(({ url }) => useWinterResource<{ place: string }>(url), { initialProps: { url: '/old' } })
    rerender({ url: '/new' })
    expect(result.current.data).toBeNull()
    await waitFor(() => expect(result.current.data?.place).toBe('New'))
    await act(async () => resolveOld(response({ place: 'Old' })))
    expect(result.current.data?.place).toBe('New')
  })

  it('does not request a local forecast before a place is selected', () => {
    global.fetch = jest.fn()
    renderHook(() => useWinterResource(null))
    expect(fetch).not.toHaveBeenCalled()
  })
})

describe('shareable Winter locations', () => {
  it.each(['lat=&lon=-105', 'lat=39junk&lon=-105', 'lat=Infinity&lon=-105', 'lat=39&lat=40&lon=-105', 'lat=91&lon=-105'])('rejects malformed coordinates %s', query => {
    expect(parseWinterPlace(new URLSearchParams(query))).toBeNull()
  })
  it('restores a valid selected place', () => {
    expect(parseWinterPlace(new URLSearchParams('lat=39.74&lon=-104.99&place=Denver'))).toEqual({ lat: 39.74, lon: -104.99, name: 'Denver' })
  })
})
