import React from 'react'
import { act, render, screen, waitFor } from '@testing-library/react'
import SolarCommandTerminal from '@/components/space-weather/SolarCommandTerminal'
import SpaceWeatherClient from '@/app/space-weather/space-weather-client'

jest.mock('next/dynamic', () => () => () => null)
jest.mock('@/components/page-wrapper', () => ({ __esModule: true, default: ({ children }: { children: React.ReactNode }) => <>{children}</> }))
jest.mock('@/components/share-buttons', () => ({ ShareButtons: () => null }))

const props: React.ComponentProps<typeof SolarCommandTerminal> = {
  scales: null, alerts: [], alertsAvailable: false, kpIndex: null,
  solarWind: null, sunspots: null, xrayFlux: null, auroraForecast: null,
}
const quietScales = {
  R: { scale: 0, text: 'None', description: '' },
  S: { scale: 0, text: 'None', description: '' },
  G: { scale: 0, text: 'None', description: '' },
}
const quietKp = { current: { value: 1, timeTag: '2026-11-08T01:00:00Z' }, forecast: null }

describe('Space Weather overall status', () => {
  it('does not assert quiet while the condition feeds are loading', () => {
    render(<SolarCommandTerminal {...props} isLoading />)
    expect(screen.queryByText('QUIET', { exact: true })).not.toBeInTheDocument()
    expect(screen.getByText('LOADING', { exact: true })).toBeInTheDocument()
  })

  it('shows unavailable when both condition feeds fail', () => {
    render(<SolarCommandTerminal {...props} />)
    expect(screen.queryByText('QUIET', { exact: true })).not.toBeInTheDocument()
    expect(screen.getByRole('status', { name: 'Space weather status' })).toHaveTextContent('UNAVAILABLE')
  })

  it.each([
    { scales: quietScales, kpIndex: null },
    { scales: null, kpIndex: quietKp },
    { scales: quietScales, kpIndex: { ...quietKp, current: { value: NaN, timeTag: '' } } },
  ])('does not assert quiet from incomplete condition data %#', (data) => {
    render(<SolarCommandTerminal {...props} {...data} />)
    expect(screen.queryByText('QUIET', { exact: true })).not.toBeInTheDocument()
    expect(screen.getByText('PARTIAL DATA', { exact: true })).toBeInTheDocument()
  })

  it('shows quiet when Kp and all NOAA scales are available and quiet', () => {
    render(<SolarCommandTerminal {...props} scales={quietScales} kpIndex={quietKp} />)
    expect(screen.getByText('QUIET', { exact: true })).toBeInTheDocument()
  })

  it('keeps an observed storm visible even if the scales feed fails', () => {
    render(<SolarCommandTerminal {...props} kpIndex={{ ...quietKp, current: { ...quietKp.current, value: 7 } }} />)
    expect(screen.getByText('STORM CONDITIONS', { exact: true })).toBeInTheDocument()
  })
})

describe('Space Weather dashboard failures', () => {
  beforeEach(() => { jest.useFakeTimers() })
  afterEach(() => { jest.useRealTimers(); jest.restoreAllMocks() })

  it('shows a page failure when every API returns an error', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 503 })
    render(<SpaceWeatherClient />)
    expect(await screen.findByText(/Unable to load space weather data/)).toBeInTheDocument()
    expect(screen.queryByText('QUIET', { exact: true })).not.toBeInTheDocument()
  })

  it('does not keep a quiet status after a refresh loses all feeds', async () => {
    const fetchMock = jest.fn().mockImplementation(async (url: string) => ({
      ok: true,
      json: async () => url.endsWith('/scales') ? { scales: quietScales }
        : url.endsWith('/kp-index') ? { data: quietKp } : { alerts: [] },
    }))
    global.fetch = fetchMock
    render(<SpaceWeatherClient />)
    await waitFor(() => expect(screen.getByText('QUIET', { exact: true })).toBeInTheDocument())
    fetchMock.mockResolvedValue({ ok: false, status: 503 })
    await act(async () => { jest.advanceTimersByTime(5 * 60_000) })
    expect(screen.queryByText('QUIET', { exact: true })).not.toBeInTheDocument()
    expect(screen.getByRole('status', { name: 'Space weather status' })).toHaveTextContent('UNAVAILABLE')
  })
})
