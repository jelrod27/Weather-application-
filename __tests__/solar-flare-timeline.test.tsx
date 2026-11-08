import React from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import SolarFlareTimeline from '@/components/space-weather/SolarFlareTimeline'

const fetchMock = jest.fn()
const empty = { events: [], summary: { total: 0, byClass: { X: 0, M: 0, C: 0, B: 0 }, strongestFlare: 'None', withCME: 0 }, updatedAt: '2026-11-08T01:00:00Z' }

describe('solar flare catalog recovery', () => {
  beforeEach(() => { global.fetch = fetchMock; fetchMock.mockReset(); jest.useFakeTimers() })
  afterEach(() => { jest.useRealTimers() })

  it.each([
    { ok: false, json: async () => ({ error: 'Too Many Requests' }) },
    { ok: true, json: async () => ({ unexpected: 'payload' }) },
  ])('shows unavailable rather than no activity for a failed or malformed response %#', async (response) => {
    fetchMock.mockResolvedValue(response)
    render(<SolarFlareTimeline />)
    expect(await screen.findByRole('alert')).toHaveTextContent(/catalog.*unavailable/i)
    expect(screen.queryByText(/No flare activity detected/)).not.toBeInTheDocument()
  })

  it('bounds a stalled request and allows a successful manual retry', async () => {
    fetchMock.mockImplementationOnce((_url: string, options: RequestInit) => new Promise((_resolve, reject) => {
      options.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
    }))
    render(<SolarFlareTimeline />)
    await act(async () => { jest.advanceTimersByTime(12_000) })
    expect(screen.getByRole('alert')).toHaveTextContent(/unavailable/i)
    fetchMock.mockResolvedValue({ ok: true, json: async () => empty })
    fireEvent.click(screen.getByRole('button', { name: 'Refresh solar flare catalog' }))
    expect(await screen.findByText(/No cataloged flares/)).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('preserves loaded events and warns when a refresh fails', async () => {
    const event = { id: 'flare-1', peakTime: '2026-11-07T19:00:00Z', classification: 'M3.5', classLetter: 'M' }
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ ...empty, events: [event], summary: { ...empty.summary, total: 1, strongestFlare: 'M3.5' } }) })
    render(<SolarFlareTimeline />)
    await screen.findByText('M3.5', { exact: true })
    fetchMock.mockResolvedValue({ ok: false, json: async () => ({ error: 'Unavailable' }) })
    fireEvent.click(screen.getByRole('button', { name: 'Refresh solar flare catalog' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/previously loaded/i)
    expect(screen.getByText('M3.5', { exact: true })).toBeInTheDocument()
  })
})
