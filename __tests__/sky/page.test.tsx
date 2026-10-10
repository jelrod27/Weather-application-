import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import SkyPage from '@/app/read-your-sky/page'
import SkyReading from '@/app/read-your-sky/sky-reading'
import { readSkyContext } from '@/lib/sky/context'
import { getReadYourSkyHref } from '@/lib/weather/journey'
import type { SkyEstimate } from '@/lib/sky/estimate'

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }))
jest.mock('@/components/navigation', () => ({ __esModule: true, default: () => null }))
jest.mock('@/components/weather-search', () => ({ __esModule: true, default: ({ onSearch, error }: { onSearch: (query: string) => void; error?: string }) => <div><label>Choose a place<input /></label><button onClick={() => onSearch('Portland')}>Search test place</button>{error && <p role="alert">{error}</p>}</div> }))

const now = Date.parse('2026-10-09T21:20Z')
const context = readSkyContext(new URLSearchParams({ lat: '45.5152', lon: '-122.6784', label: 'Portland', tz: 'America/Los_Angeles', returnTo: '/weather/portland-or?location=45.5152%2C-122.6784' }))
const estimate = (): SkyEstimate => ({ fetchedAt: now, providerReceivedAt: now, timezone: 'America/Los_Angeles', current: { time: now - 5 * 60_000, total: 76, layers: [68, 12, 42], isDay: true, precipitation: 0, weatherCode: 3, visibility: 20000 }, hours: [{ time: now + 40 * 60_000, total: 60 }, { time: now + 100 * 60_000, total: 46 }] })
const response = (data: unknown): Response => ({ ok: true, json: async () => data }) as Response
const fetchMock = jest.fn()
const originalFetch = global.fetch
beforeEach(() => { jest.spyOn(Date, 'now').mockReturnValue(now); jest.spyOn(console, 'error').mockImplementation(() => {}); global.fetch = fetchMock; fetchMock.mockReset() })
afterEach(() => { jest.useRealTimers(); jest.restoreAllMocks(); global.fetch = originalFetch })

describe('Read your sky page', () => {
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

  test.each([-60_000, 2 * 60 * 60_000])('keeps valid data and its outlook when the device clock differs by %s ms, including retry', async offset => {
    jest.spyOn(Date, 'now').mockReturnValue(now + offset)
    fetchMock.mockResolvedValue(response(estimate()))
    render(<SkyReading context={context} />)
    expect(await screen.findByRole('heading', { name: 'Clouds at more than one height' })).toBeVisible()
    expect(screen.getByText(/Weather-model estimate/)).toHaveTextContent('2:15 PM GMT-7')
    const outlook = screen.getByRole('region', { name: 'Two-hour outlook' })
    expect(outlook).toHaveTextContent('60%')
    expect(outlook).toHaveTextContent('46%')
    fireEvent.click(screen.getByRole('button', { name: 'Refresh estimate' }))
    expect(await screen.findByRole('heading', { name: 'Clouds at more than one height' })).toBeVisible()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  test.each(['current', 'providerReceivedAt'] as const)('includes response-body delay when checking %s expiry', async field => {
    jest.useFakeTimers()
    jest.setSystemTime(now - 60_000)
    const data = estimate()
    const almostExpired = now - 30 * 60_000 + 3_000
    if (field === 'current') data.current.time = almostExpired
    else data.providerReceivedAt = almostExpired
    fetchMock.mockResolvedValue({ ok: true, json: () => new Promise(resolve => setTimeout(() => resolve(data), 6_000)) } as Response)
    render(<SkyReading context={context} />)
    await act(async () => { await jest.advanceTimersByTimeAsync(6_000) })
    expect(screen.getByText(/too old to describe the sky now/)).toBeVisible()
    expect(screen.getByText('General learning example · not your current sky')).toBeVisible()
  })

  test('excludes an outlook hour that passes during response transport despite a slow device clock', async () => {
    jest.useFakeTimers()
    jest.setSystemTime(now - 60_000)
    const data = estimate()
    data.hours[0].time = now + 3_000
    fetchMock.mockResolvedValue({ ok: true, json: () => new Promise(resolve => setTimeout(() => resolve(data), 6_000)) } as Response)
    render(<SkyReading context={context} />)
    await act(async () => { await jest.advanceTimersByTimeAsync(6_000) })
    expect(screen.getByRole('heading', { name: 'Clouds at more than one height' })).toBeVisible()
    const outlook = screen.getByRole('region', { name: 'Two-hour outlook' })
    expect(outlook).not.toHaveTextContent('60%')
    expect(outlook).toHaveTextContent('46%')
  })

  test('advances the outlook and expires current data even if the device clock moves backward', async () => {
    jest.useFakeTimers()
    jest.setSystemTime(now)
    const data = estimate()
    data.hours[0].time = now + 30_000
    fetchMock.mockResolvedValue(response(data))
    render(<SkyReading context={context} />)
    await act(async () => { await jest.advanceTimersByTimeAsync(0) })
    expect(screen.getByRole('region', { name: 'Two-hour outlook' })).toHaveTextContent('60%')
    jest.setSystemTime(now - 60 * 60_000)
    await act(async () => { await jest.advanceTimersByTimeAsync(60_000) })
    expect(screen.getByRole('heading', { name: 'Clouds at more than one height' })).toBeVisible()
    expect(screen.getByRole('region', { name: 'Two-hour outlook' })).not.toHaveTextContent('60%')
    await act(async () => { await jest.advanceTimersByTimeAsync(25 * 60_000) })
    expect(screen.getByText(/too old to describe the sky now/)).toBeVisible()
    expect(fetchMock).toHaveBeenCalledTimes(1)
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

  test.each([0, 80])('shows the known %s%% total when only a zero low layer is available', async total => {
    const data = estimate()
    data.current = { ...data.current, total, layers: [0, null, null] }
    fetchMock.mockResolvedValueOnce(response(data))
    render(<SkyReading context={context} />)
    const illustration = await screen.findByRole('img', { name: /Overall cloud coverage diagram/ })
    expect(within(illustration).getByText(`${total}%`)).toBeVisible()
    expect(within(illustration).getByText('Layer details incomplete')).toBeVisible()
    expect(illustration).toHaveTextContent('Low 0, middle unknown, high unknown')
  })

  test('retains known layers without inventing a total when total coverage is missing', async () => {
    const data = estimate()
    data.current = { ...data.current, total: null, layers: [45, null, null] }
    fetchMock.mockResolvedValueOnce(response(data))
    render(<SkyReading context={context} />)
    const illustration = await screen.findByRole('img', { name: /schematic low, middle and high/ })
    expect(within(illustration).getByText('45%')).toBeVisible()
    expect(illustration).toHaveTextContent('Total cloud cover unknown')
    expect(screen.getByText(/Overall cloud coverage is unavailable/)).toBeVisible()
  })

  test('records a malformed sky response with context and keeps the fallback usable', async () => {
    fetchMock.mockResolvedValueOnce(response({ current: 'invalid' }))
    render(<SkyReading context={context} />)
    expect(await screen.findByText('General learning example · not your current sky')).toBeVisible()
    expect(console.error).toHaveBeenCalledWith('[Read your sky: load estimate]', expect.objectContaining({ message: 'Invalid sky response' }))
    expect(screen.getByRole('button', { name: 'Try again' })).toBeEnabled()
  })

  test('records malformed place results without logging the user query or response', async () => {
    fetchMock.mockResolvedValueOnce(response([{ name: 'Portland', lat: 'invalid', lon: -122 }]))
    render(<SkyReading context={readSkyContext(new URLSearchParams())} />)
    fireEvent.click(screen.getByRole('button', { name: 'Search test place' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Location not found or unavailable')
    expect(console.error).toHaveBeenCalledWith('[Read your sky: place search]', expect.objectContaining({ message: 'Invalid place response' }))
  })

  test('does not log expected HTTP failures as new client defects', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 503 } as Response)
    render(<SkyReading context={context} />)
    expect(await screen.findByText('General learning example · not your current sky')).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Change place' }))
    fireEvent.click(screen.getByRole('button', { name: 'Search test place' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Location not found or unavailable')
    expect(console.error).not.toHaveBeenCalled()
  })

  test('does not log intentional cancellation when leaving the page', async () => {
    fetchMock.mockImplementationOnce((_url: string, options: RequestInit) => new Promise((_resolve, reject) => {
      options.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
    }))
    const view = render(<SkyReading context={context} />)
    await act(async () => { view.unmount() })
    expect(console.error).not.toHaveBeenCalled()
  })

  test('expires a displayed estimate on return when the browser elapsed clock paused during sleep', async () => {
    jest.useFakeTimers()
    jest.setSystemTime(now)
    fetchMock.mockResolvedValue(response(estimate()))
    render(<SkyReading context={context} />)
    await act(async () => { await Promise.resolve() })
    expect(screen.getByRole('heading', { name: 'Clouds at more than one height' })).toBeVisible()
    jest.setSystemTime(now + 31 * 60_000)
    act(() => { document.dispatchEvent(new Event('visibilitychange')) })
    expect(screen.getByText(/too old to describe the sky now/)).toBeVisible()
    expect(screen.getByText('General learning example · not your current sky')).toBeVisible()
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
})
