import { act, renderHook } from '@testing-library/react'
import { useRadarController } from '@/hooks/useRadarController'
const timestamp = Date.parse('2026-09-26T20:00Z')
jest.mock('@/hooks/useRadarMapEngine', () => ({ useRadarMapEngine: () => ({}) }))
jest.mock('@/hooks/useRadarOverlayLoader', () => ({ useRadarOverlayLoader: () => ({ frames: [{ timestamp, isLive: true }], frameIndex: 0, isPlaying: false }) }))
jest.mock('@/hooks/useRadarUrlState', () => ({ useRadarUrlSnapshot: jest.fn(), useRadarUrlState: () => ({}) }))
it('updates paused newest-frame age and cleans up the timer', () => {
  jest.useFakeTimers().setSystemTime(timestamp + 15 * 60_000)
  const { result, unmount } = renderHook(() => useRadarController({}))
  expect(result.current.relativeTime).toBe('15m ago')
  act(() => jest.advanceTimersByTime(60_000))
  expect(result.current.relativeTime).toBe('16m ago')
  unmount()
  expect(jest.getTimerCount()).toBe(0)
  jest.useRealTimers()
})
