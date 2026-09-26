import { act, renderHook, waitFor } from '@testing-library/react'
import { getDashboardWeather } from '@/lib/dashboard-weather'
import { useDashboardWeather } from '@/hooks/useDashboardWeather'
jest.mock('@/lib/dashboard-weather', () => ({ ...jest.requireActual('@/lib/dashboard-weather'), getDashboardWeather: jest.fn() }))
const getWeather = jest.mocked(getDashboardWeather)
const input = { latitude: 40, longitude: -74, units: 'imperial' as const, windUnit: 'ms' as const, enabled: true }
const data = { temperature: 70, description: 'clear', humidity: 50, windSpeed: 5, icon: '01d', feelsLike: 70, pressure: 1013, visibility: 10, units: 'imperial' as const, windUnit: 'ms' as const, fetchedAt: new Date().toISOString(), observedAt: null, stale: false }
beforeEach(() => getWeather.mockReset())
it('recovers on retry and keeps dated weather through failed refresh', async () => {
  getWeather.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(data).mockRejectedValueOnce(new Error('offline'))
  const { result } = renderHook(() => useDashboardWeather(input))
  await waitFor(() => expect(result.current.error).toBeTruthy())
  await act(() => result.current.refresh())
  expect(result.current.weather).toEqual(data)
  await act(() => result.current.refresh())
  expect(result.current.weather).toMatchObject({ temperature: 70, stale: true, fetchedAt: data.fetchedAt })
})
it('ignores a response for obsolete coordinates and aborts on unmount', async () => {
  let finish!: (value: typeof data) => void
  getWeather.mockImplementationOnce(() => new Promise(resolve => { finish = resolve })).mockResolvedValueOnce({ ...data, temperature: 50 })
  const { result, rerender, unmount } = renderHook(props => useDashboardWeather(props), { initialProps: input })
  rerender({ ...input, latitude: 51 })
  await waitFor(() => expect(result.current.weather?.temperature).toBe(50))
  await act(async () => finish(data))
  expect(result.current.weather?.temperature).toBe(50)
  expect(getWeather.mock.calls[0]?.[3]?.signal?.aborted).toBe(true)
  unmount()
  expect(getWeather.mock.calls[1]?.[3]?.signal?.aborted).toBe(true)
})
it('waits for preferences and honors the independent wind unit', async () => {
  getWeather.mockResolvedValue(data)
  const { rerender } = renderHook(props => useDashboardWeather(props), { initialProps: { ...input, enabled: false } })
  expect(getWeather).not.toHaveBeenCalled()
  rerender(input)
  await waitFor(() => expect(getWeather).toHaveBeenCalledWith(40, -74, 'imperial', expect.objectContaining({ windUnit: 'ms' })))
})
it('expires an old snapshot without extending its original receipt time', async () => {
  jest.useFakeTimers().setSystemTime(new Date(data.fetchedAt))
  getWeather.mockResolvedValue(data)
  const { result } = renderHook(() => useDashboardWeather(input))
  await act(async () => {})
  expect(result.current.weather).not.toBeNull()
  act(() => jest.advanceTimersByTime(31 * 60_000))
  expect(result.current.weather).toBeNull()
  expect(result.current.error).toBeTruthy()
  jest.useRealTimers()
})
