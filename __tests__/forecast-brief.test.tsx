import { render, screen } from '@testing-library/react'
import { ForecastBrief } from '@/components/forecast-brief'
import { getForecastBrief } from '@/lib/weather/forecast-brief'
import type { EnhancedHourlyForecast } from '@/lib/types'

const NOW = Date.parse('2026-09-26T22:15:00Z')
const hour = (offset: number, overrides: Partial<EnhancedHourlyForecast> = {}): EnhancedHourlyForecast => ({
  dt: Date.parse('2026-09-26T22:00:00Z') / 1000 + offset * 3600,
  time: 'ignored viewer label', temp: 15, precipChance: 0, windSpeed: 0,
  condition: 'Clouds', description: 'Cloudy', ...overrides,
})

it('uses current and upcoming hours, sorts and deduplicates, and excludes stale or distant data', () => {
  const brief = getForecastBrief([hour(7), hour(-1), hour(2), hour(0), hour(1), hour(1)], NOW)
  expect(brief?.hours.map(value => value.dt)).toEqual([hour(0).dt, hour(1).dt, hour(2).dt])
  expect(getForecastBrief([hour(-5), hour(8)], NOW)).toBeNull()
})

it('retains measured zero and omits incomplete or invalid metric ranges', () => {
  expect(getForecastBrief([hour(0)], NOW)).toMatchObject({ temperature: { low: 15, high: 15 }, precipitation: { low: 0, high: 0 }, windHigh: 0 })
  expect(getForecastBrief([hour(0), hour(1, { temp: NaN, precipChance: 110, windSpeed: undefined })], NOW)).toMatchObject({ temperature: null, precipitation: null, windHigh: null })
})

it('summarizes probability trends without promising rain arrival', () => {
  expect(getForecastBrief([hour(0), hour(1, { precipChance: 60 })], NOW)?.precipitation?.trend).toBe('rising')
  expect(getForecastBrief([hour(0, { precipChance: 60 }), hour(1)], NOW)?.precipitation?.trend).toBe('easing')
})

describe('local briefing display', () => {
  beforeEach(() => { jest.useFakeTimers(); jest.setSystemTime(NOW) })
  afterEach(() => jest.useRealTimers())
  it('renders metric units and location time across midnight', () => {
    render(<ForecastBrief weather={{ location: 'Tokyo', unit: '°C', timezone: 'Asia/Tokyo', hourlyForecast: [hour(0), hour(1)] }} hourlyHref="/hourly?city=Tokyo" />)
    expect(screen.getByText('15°C')).toBeInTheDocument()
    expect(screen.getByText('0%')).toBeInTheDocument()
    expect(screen.getByText('km/h')).toBeInTheDocument()
    expect(screen.getByText(/7:00 AM.*9:00 AM/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Plan the next few hours/ })).toHaveAttribute('href', '/hourly?city=Tokyo')
  })
  it('does not present yesterday’s cached hourly data as current', () => {
    render(<ForecastBrief weather={{ location: 'London', unit: '°C', hourlyForecast: [hour(-24)] }} hourlyHref="/hourly?city=London" />)
    expect(screen.getByText(/recent hourly outlook is unavailable/)).toBeInTheDocument()
    expect(screen.queryByText('15°C')).not.toBeInTheDocument()
  })
})
