import { act, fireEvent, render, screen } from '@testing-library/react'
import AlertBell from '@/components/alerts/alert-bell'

let mockUser: { id: string } | null = { id: 'A' }
let mockInitialized = true
jest.mock('@/lib/auth', () => ({ useAuth: () => ({ user: mockUser, isInitialized: mockInitialized }) }))

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(done => { resolve = done })
  return { promise, resolve }
}

function response(owner: string, readAt: string | null = null): Response {
  return { ok: true, json: async () => ({
    unreadCount: readAt ? 0 : 1,
    alerts: [{ id: owner, kind: 'severe_weather', createdAt: '2030-01-01', readAt, title: 'Warning', summary: `${owner} private location`, href: '/warnings' }],
  }) } as Response
}

describe('alert bell account lifecycle', () => {
  const originalFetch = global.fetch
  const fetchMock = jest.fn()
  beforeEach(() => {
    jest.useFakeTimers()
    mockUser = { id: 'A' }
    mockInitialized = true
    fetchMock.mockReset()
    global.fetch = fetchMock
  })
  afterEach(() => { jest.useRealTimers(); global.fetch = originalFetch })

  it.each([false, true])('rejects a late A response after switching to B (via null=%s)', async viaNull => {
    const a = deferred<Response>(), b = deferred<Response>()
    fetchMock.mockReturnValueOnce(a.promise).mockReturnValueOnce(b.promise)
    const view = render(<AlertBell />)
    if (viaNull) { mockUser = null; view.rerender(<AlertBell />) }
    mockUser = { id: 'B' }; view.rerender(<AlertBell />)
    await act(async () => b.resolve(response('B')))
    await act(async () => a.resolve(response('A')))
    fireEvent.click(screen.getByRole('button', { name: /weather alerts/i }))
    expect(screen.queryByText('A private location')).not.toBeInTheDocument()
    expect(screen.getByText('B private location')).toBeInTheDocument()
  })

  it('hides already loaded A rows and unread counts while B is loading', async () => {
    fetchMock.mockResolvedValueOnce(response('A')).mockReturnValueOnce(new Promise(() => {}))
    const view = render(<AlertBell />)
    await act(async () => {})
    fireEvent.click(screen.getByRole('button', { name: /weather alerts/i }))
    expect(screen.getByText('A private location')).toBeInTheDocument()
    mockUser = { id: 'B' }; view.rerender(<AlertBell />)
    expect(screen.queryByText('A private location')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Weather alerts' })).toBeInTheDocument()
  })

  it('does not restart an old account fetch after mark-read finishes', async () => {
    const patch = deferred<Response>()
    fetchMock.mockResolvedValueOnce(response('A')).mockReturnValueOnce(patch.promise).mockResolvedValueOnce(response('B'))
    const view = render(<AlertBell />)
    await act(async () => {})
    fireEvent.click(screen.getByRole('button', { name: /weather alerts/i }))
    fireEvent.click(screen.getByRole('button', { name: /mark all read/i }))
    mockUser = { id: 'B' }; view.rerender(<AlertBell />)
    await act(async () => {})
    await act(async () => patch.resolve(response('A')))
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('lets an issued mark-read finish when an alert click navigates away', async () => {
    const patch = deferred<Response>()
    fetchMock.mockResolvedValueOnce(response('A')).mockReturnValueOnce(patch.promise)
    const view = render(<AlertBell />)
    await act(async () => {})
    fireEvent.click(screen.getByRole('button', { name: /weather alerts/i }))
    fireEvent.click(screen.getByRole('link', { name: /Warning A private location/i }))
    const request = fetchMock.mock.calls[1][1] as RequestInit
    expect(request.method).toBe('PATCH')
    view.unmount()
    expect(request.signal?.aborted ?? false).toBe(false)
    await act(async () => patch.resolve(response('A')))
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('keeps the latest read state when an older poll finishes after a refresh', async () => {
    const poll = deferred<Response>()
    fetchMock.mockResolvedValueOnce(response('A')).mockReturnValueOnce(poll.promise)
      .mockResolvedValueOnce({ ok: true }).mockResolvedValueOnce(response('A', '2030-01-02'))
    render(<AlertBell />)
    await act(async () => {})
    act(() => jest.advanceTimersByTime(60_000))
    fireEvent.click(screen.getByRole('button', { name: /weather alerts/i }))
    fireEvent.click(screen.getByRole('button', { name: /mark all read/i }))
    await act(async () => {})
    expect(screen.getByRole('button', { name: 'Weather alerts' })).toBeInTheDocument()
    await act(async () => poll.resolve(response('A')))
    expect(screen.getByRole('button', { name: 'Weather alerts' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /mark all read/i })).not.toBeInTheDocument()
  })

  it('keeps loading while the latest poll is pending after an older request finishes', async () => {
    const initial = deferred<Response>(), poll = deferred<Response>()
    fetchMock.mockReturnValueOnce(initial.promise).mockReturnValueOnce(poll.promise)
    render(<AlertBell />)
    act(() => jest.advanceTimersByTime(60_000))
    fireEvent.click(screen.getByRole('button', { name: /weather alerts/i }))
    await act(async () => initial.resolve(response('stale')))
    expect(screen.getByText('Loading alerts…')).toBeInTheDocument()
    expect(screen.queryByText('stale private location')).not.toBeInTheDocument()
    await act(async () => poll.resolve(response('latest')))
    expect(screen.getByText('latest private location')).toBeInTheDocument()
    expect(screen.queryByText('Loading alerts…')).not.toBeInTheDocument()
  })

  it('invalidates an earlier A lifecycle even when the same user returns', async () => {
    const oldA = deferred<Response>()
    fetchMock.mockReturnValueOnce(oldA.promise).mockResolvedValueOnce(response('B')).mockResolvedValueOnce(response('new A'))
    const view = render(<AlertBell />)
    mockUser = { id: 'B' }; view.rerender(<AlertBell />)
    await act(async () => {})
    mockUser = { id: 'A' }; view.rerender(<AlertBell />)
    await act(async () => {})
    await act(async () => oldA.resolve(response('old A')))
    fireEvent.click(screen.getByRole('button', { name: /weather alerts/i }))
    expect(screen.queryByText('old A private location')).not.toBeInTheDocument()
    expect(screen.getByText('new A private location')).toBeInTheDocument()
  })

  it('renders nothing for anonymous or uninitialized auth and stops polling on unmount', async () => {
    mockInitialized = false
    const view = render(<AlertBell />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
    mockInitialized = true; mockUser = null; view.rerender(<AlertBell />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    mockUser = { id: 'A' }; fetchMock.mockResolvedValue(response('A')); view.rerender(<AlertBell />)
    await act(async () => {})
    view.unmount()
    act(() => jest.advanceTimersByTime(60_000))
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
