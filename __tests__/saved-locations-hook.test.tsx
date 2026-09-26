import { act, renderHook, waitFor } from '@testing-library/react'
import { useSavedLocations } from '@/lib/supabase/hooks'
import { getSavedLocations } from '@/lib/supabase/database'
let mockUser = { id: 'first' }
jest.mock('@/lib/auth/auth-context', () => ({ useAuth: () => ({ user: mockUser, loading: false }) }))
jest.mock('@/lib/supabase/database', () => ({ getSavedLocations: jest.fn() }))
const getLocations = jest.mocked(getSavedLocations)
beforeEach(() => { mockUser = { id: 'first' }; getLocations.mockReset() })
it('recovers from list failure with a visible loading lifecycle', async () => {
  getLocations.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce([])
  const { result } = renderHook(() => useSavedLocations())
  await waitFor(() => expect(result.current.error).toBeTruthy())
  await act(() => result.current.refetch())
  expect(result.current).toMatchObject({ error: null, loading: false, locations: [] })
})
it('ignores an older account response', async () => {
  let finish!: (locations: Awaited<ReturnType<typeof getSavedLocations>>) => void
  getLocations.mockImplementationOnce(() => new Promise(resolve => { finish = resolve })).mockResolvedValueOnce([])
  const { result, rerender } = renderHook(() => useSavedLocations())
  mockUser = { id: 'second' }
  rerender()
  await waitFor(() => expect(result.current.loading).toBe(false))
  await act(async () => finish([{ id: 'old' } as never]))
  expect(result.current.locations).toEqual([])
})
