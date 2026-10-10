import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import SkyPage from '@/app/read-your-sky/page'
import SkyReading from '@/app/read-your-sky/sky-reading'
import { readSkyContext } from '@/lib/sky/context'
import { getReadYourSkyHref } from '@/lib/weather/journey'
import type { SkyEstimate } from '@/lib/sky/estimate'

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }))
jest.mock('@/components/navigation', () => ({ __esModule: true, default: () => null }))
jest.mock('@/components/weather-search', () => ({ __esModule: true, default: () => <label>Choose a place<input /></label> }))

const now = Date.parse('2026-10-09T21:20Z')
const context = readSkyContext(new URLSearchParams({ lat: '45.5152', lon: '-122.6784', label: 'Portland', tz: 'America/Los_Angeles', returnTo: '/weather/portland-or?location=45.5152%2C-122.6784' }))
const estimate = (): SkyEstimate => ({ fetchedAt: now, providerReceivedAt: now, timezone: 'America/Los_Angeles', current: { time: now - 5 * 60_000, total: 76, layers: [68, 12, 42], isDay: true, precipitation: 0, weatherCode: 3, visibility: 20000 }, hours: [{ time: now + 40 * 60_000, total: 60 }, { time: now + 100 * 60_000, total: 46 }] })
const response = (data: SkyEstimate): Response => ({ ok: true, json: async () => data }) as Response
const fetchMock = jest.fn()
const originalFetch = global.fetch
beforeEach(() => { jest.spyOn(Date, 'now').mockReturnValue(now); global.fetch = fetchMock; fetchMock.mockReset() })
afterEach(() => { jest.restoreAllMocks(); global.fetch = originalFetch })

test('shows the same place, time and layer evidence in the words and illustration, and preserves the complete learning return', async () => {
  fetchMock.mockResolvedValue(response(estimate()))
  render(<SkyReading context={context} />)
  expect(await screen.findByRole('heading', { name: 'Clouds at more than one height' })).toBeVisible()
  expect(screen.getByRole('img').textContent).toContain('Low 68, middle 12, high 42')
  expect(screen.getByText(/Weather-model estimate/)).toHaveTextContent('2:15 PM GMT-7')
  expect(screen.getByRole('link', { name: /Back to Portland/ })).toHaveAttribute('href', context.returnHref)
  const lesson = new URL(screen.getByRole('link', { name: 'Learn to compare cloud shapes' }).getAttribute('href')!, 'https://test.local')
  const returned = new URL(lesson.searchParams.get('returnTo')!, 'https://test.local')
  expect(returned.pathname).toBe('/read-your-sky')
  expect(returned.searchParams.get('lat')).toBe('45.5152')
  expect(returned.searchParams.get('returnTo')).toBe(context.returnHref)
})

test('shows a general example after failure and replaces it only when a retry succeeds', async () => {
  fetchMock.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(response(estimate()))
  render(<SkyReading context={context} />)
  expect(await screen.findByRole('heading', { name: /We don’t have a current sky estimate for Portland/ })).toBeVisible()
  expect(screen.getByText('General learning example · not your current sky')).toBeVisible()
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
  expect(await screen.findByRole('heading', { name: 'Clouds at more than one height' })).toBeVisible()
  expect(fetchMock).toHaveBeenCalledTimes(2)
})

test('clear/night and incomplete-layer states use an honest illustration with no invented heights', async () => {
  const data = estimate()
  data.current = { ...data.current, total: 0, layers: [0, 0, 0], isDay: false }
  fetchMock.mockResolvedValueOnce(response(data))
  const view = render(<SkyReading context={context} />)
  expect(await screen.findByText(/Cloud shapes can be harder to distinguish after dark/)).toBeVisible()
  expect(screen.getByRole('img')).toHaveTextContent('No cloud in this estimate')
  view.unmount()
  data.current = { ...data.current, total: 70, layers: [null, null, null] }
  data.hours = []
  fetchMock.mockResolvedValueOnce(response(data))
  render(<SkyReading context={context} />)
  expect(await screen.findByRole('img', { name: /Overall cloud coverage diagram/ })).toBeVisible()
  expect(screen.getByText(/two-hour cloud outlook is unavailable/)).toBeVisible()
})

test('expires a displayed estimate instead of continuing to label it current', async () => {
  jest.useFakeTimers()
  jest.setSystemTime(now)
  fetchMock.mockResolvedValue(response(estimate()))
  render(<SkyReading context={context} />)
  await act(async () => { await Promise.resolve() })
  expect(screen.getByRole('heading', { name: 'Clouds at more than one height' })).toBeVisible()
  jest.setSystemTime(now + 31 * 60_000)
  act(() => { jest.advanceTimersByTime(60_000) })
  expect(screen.getByText(/too old to describe the sky now/)).toBeVisible()
  expect(screen.getByText('General learning example · not your current sky')).toBeVisible()
  jest.useRealTimers()
})

test('offers place selection for an invalid direct URL and rejects external returns', async () => {
  render(await SkyPage({ searchParams: Promise.resolve({ lat: '45junk', lon: '0', returnTo: '//evil.test', tz: 'Bad/Zone' }) }))
  expect(screen.getByRole('textbox', { name: 'Choose a place' })).toBeVisible()
  expect(screen.getByRole('link', { name: /Back to your forecast/ })).toHaveAttribute('href', '/')
  expect(fetchMock).not.toHaveBeenCalled()
})

test('never replaces a new location with a late response for the previous place', async () => {
  let finishOld!: (response: Response) => void
  fetchMock.mockImplementationOnce(() => new Promise(resolve => { finishOld = resolve })).mockResolvedValueOnce(response({ ...estimate(), current: { ...estimate().current, total: 0, layers: [0, 0, 0] } }))
  const view = render(<SkyReading key="Portland" context={context} />)
  const london = readSkyContext(new URL(getReadYourSkyHref({ location: 'London', coordinates: { lat: 51.5, lon: 0 } }), 'https://test.local').searchParams)
  view.rerender(<SkyReading key="London" context={london} />)
  await waitFor(() => expect(screen.getByRole('heading', { name: 'Little cloud to read right now' })).toBeVisible())
  await act(async () => { finishOld(response(estimate())) })
  expect(screen.getByRole('heading', { name: 'Little cloud to read right now' })).toBeVisible()
  expect(screen.queryByRole('heading', { name: 'Clouds at more than one height' })).not.toBeInTheDocument()
})
