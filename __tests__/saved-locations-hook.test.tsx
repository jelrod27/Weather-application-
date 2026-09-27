import { act, renderHook, waitFor } from '@testing-library/react'
import { useSavedLocations } from '@/lib/supabase/hooks'
import { captureDbError } from '@/lib/error-utils'
import type { SavedLocation } from '@/lib/supabase/types'
let mockUser = { id: 'first' }
jest.mock('@/lib/auth/auth-context', () => ({ useAuth: () => ({ user: mockUser, loading: false }) }))
jest.mock('@/lib/supabase/client', () => ({ supabase: { from: () => ({ select: () => ({ eq: mockFilterUser }) }) } }))
jest.mock('@/lib/error-utils', () => ({ captureDbError: jest.fn() }))
interface QueryResult { data: SavedLocation[] | null; error: { message: string; code: string } | null }
const mockQueryResult = jest.fn<Promise<QueryResult>, []>()
const mockFilterUser = jest.fn(() => ({ order: () => ({ order: mockQueryResult }) }))
const location: SavedLocation = {
  id: 'saved-1', user_id: 'first', location_name: 'New York', city: 'New York', state: 'NY', country: 'US',
  latitude: 40.71, longitude: -74.01, is_favorite: false, custom_name: null, notes: null,
  created_at: '2026-09-26T00:00:00Z', updated_at: '2026-09-26T00:00:00Z',
}
beforeEach(() => {
  mockUser = { id: 'first' }
  mockQueryResult.mockReset()
  mockFilterUser.mockClear()
  jest.mocked(captureDbError).mockClear()
})
it('recovers from list failure with a visible loading lifecycle', async () => {
  const error = { message: 'database unavailable', code: '08006' }
  mockQueryResult.mockResolvedValueOnce({ data: null, error }).mockResolvedValueOnce({ data: [location], error: null })
  const { result } = renderHook(() => useSavedLocations())
  await waitFor(() => expect(result.current.error).toBeTruthy())
  expect(captureDbError).toHaveBeenCalledWith('getSavedLocations', error, { userId: 'first' })
  expect(mockFilterUser).toHaveBeenCalledWith('user_id', 'first')
  await act(() => result.current.refetch())
  expect(result.current).toMatchObject({ error: null, loading: false, locations: [location] })
})
it.each(['success', 'failure'])('ignores an older account %s response', async (outcome) => {
  let finish!: (result: QueryResult) => void
  mockQueryResult.mockImplementationOnce(() => new Promise(resolve => { finish = resolve })).mockResolvedValueOnce({ data: [], error: null })
  const { result, rerender } = renderHook(() => useSavedLocations())
  mockUser = { id: 'second' }
  rerender()
  await waitFor(() => expect(result.current.loading).toBe(false))
  await act(async () => finish(outcome === 'success'
    ? { data: [location], error: null }
    : { data: null, error: { message: 'old account failure', code: '08006' } }))
  expect(result.current.locations).toEqual([])
  expect(result.current.error).toBeNull()
})
