import { fireEvent, render, screen } from '@testing-library/react'
import WinterLocalForecast from '@/components/winter/winter-local-forecast'
import WinterAlerts from '@/components/winter/winter-alerts'
import type { LocalWinterForecast } from '@/lib/winter/local-types'
import type { NWSAlert } from '@/lib/services/nws-alerts-service'

const accumulation = { status: 'unavailable' as const, blocks: [], total: { inches: null, startTime: null, endTime: null, includedPeriods: 0, complete: false }, issues: [] }
const forecast: LocalWinterForecast = {
  status: 'partial', coverage: 'conus', place: { name: 'Denver', lat: 39.7, lon: -105, timeZone: 'America/Denver' },
  fetchedAt: '2026-11-14T12:00:00Z', gridUpdatedAt: null, hourlyUpdatedAt: null, narrativeUpdatedAt: null,
  windowStart: '2026-11-14T12:00:00Z', windowEnd: '2026-11-17T12:00:00Z', sourceUrl: 'https://forecast.weather.gov/', message: 'Some source data is missing',
  snow: accumulation, ice: accumulation, hourly: [], narrative: [],
}

describe('Winter forecast panels', () => {
  it('shows unknown accumulation explicitly without a fabricated zero', () => {
    render(<WinterLocalForecast forecast={forecast} stale={false} />)
    expect(screen.getAllByText('Unknown').length).toBeGreaterThanOrEqual(2)
    expect(screen.queryByText('0.00 in')).not.toBeInTheDocument()
    expect(screen.getByText(/Some source data is missing/)).toBeInTheDocument()
  })
  it('labels an ongoing full source interval and partial totals', () => {
    const start = new Date(Date.now() - 3600000).toISOString()
    const end = new Date(Date.now() + 18000000).toISOString()
    render(<WinterLocalForecast forecast={{ ...forecast, snow: { status: 'partial', blocks: [{ startTime: start, endTime: end, inches: 2, ongoing: true }], total: { inches: 2, startTime: start, endTime: end, includedPeriods: 1, complete: false }, issues: ['Missing periods'] } }} stale />)
    expect(screen.getByText(/Ongoing: full interval amount/)).toBeInTheDocument()
    expect(screen.getByText(/Known-period total — partial coverage/)).toBeInTheDocument()
    expect(screen.getByText(/Stale forecast/)).toBeInTheDocument()
  })
  it('preserves trace accumulation as a positive amount instead of rounding to zero', () => {
    const start = new Date(Date.now() + 3600000).toISOString()
    const end = new Date(Date.now() + 7200000).toISOString()
    render(<WinterLocalForecast forecast={{ ...forecast, ice: { status: 'partial', blocks: [{ startTime: start, endTime: end, inches: 0.003, ongoing: false }], total: { inches: 0.003, startTime: start, endTime: end, includedPeriods: 1, complete: false }, issues: [] } }} stale={false} />)
    expect(screen.getAllByText('<0.01 in')).toHaveLength(2)
    expect(screen.queryByText('0.00 in')).not.toBeInTheDocument()
  })
  it('does not call initial alert failure an all-clear', () => {
    render(<WinterAlerts alerts={null} loading={false} error="Source unavailable" stale={false} place={null} />)
    expect(screen.getByText(/Winter alerts unavailable/)).toBeInTheDocument()
    expect(screen.queryByText(/No active winter alerts/)).not.toBeInTheDocument()
  })
  it('distinguishes a successful empty alert response from failure', () => {
    render(<WinterAlerts alerts={[]} loading={false} error={null} stale={false} place={null} />)
    expect(screen.getByText(/No active winter alerts/)).toBeInTheDocument()
  })
  it('keeps the national alert list compact until the visitor expands it', () => {
    const alerts: NWSAlert[] = [{ id: 'snow', event: 'Winter Storm Warning', severity: 'Severe', areaDesc: 'Test region',
      headline: 'Heavy snow is expected', expires: new Date(Date.now() + 3_600_000).toISOString(), urgency: 'Expected' }]
    render(<WinterAlerts alerts={alerts} loading={false} error={null} stale={false} place={null} />)
    expect(screen.getByText('Winter Storm Warning')).not.toBeVisible()
    fireEvent.click(screen.getByText(/View 1 active winter alert/))
    expect(screen.getByText('Winter Storm Warning')).toBeVisible()
  })
})
