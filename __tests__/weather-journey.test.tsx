import { render, screen } from '@testing-library/react'
import { WeatherJourney } from '@/components/weather-journey'
import { getWeatherJourneyLinks, getWeatherLessonHref, getWeatherReturnHref } from '@/lib/weather/journey'

describe('weather journey links', () => {
  it('keeps exact coordinates, a readable place name, and location timezone in the radar journey', () => {
    const links = getWeatherJourneyLinks({ location: 'London, UK', coordinates: { lat: 51.5, lon: 0 }, timezone: 'Europe/London' })
    const radar = new URL(links.radar, 'https://example.test')
    expect(radar.searchParams.get('lat')).toBe('51.5')
    expect(radar.searchParams.get('lon')).toBe('0')
    expect(radar.searchParams.get('label')).toBe('London, UK')
    expect(radar.searchParams.get('tz')).toBe('Europe/London')
    expect(radar.searchParams.get('returnTo')).toBe(links.forecast)
  })

  it('returns from radar to the originating hourly view and from a lesson to radar', () => {
    render(<WeatherJourney weather={{ location: 'London', coordinates: { lat: 51.5, lon: -0.12 } }} active="hourly" />)
    const radar = screen.getByRole('link', { name: 'Radar' }).getAttribute('href')!
    const hourly = screen.getByRole('link', { name: 'Hourly' }).getAttribute('href')!
    expect(new URL(radar, 'https://example.test').searchParams.get('returnTo')).toBe(hourly)
    const lesson = getWeatherLessonHref('radar', radar)
    expect(getWeatherReturnHref(new URL(lesson, 'https://example.test').searchParams.get('returnTo'))).toBe(radar)
  })

  it.each(['https://evil.test', '//evil.test', '/\\evil.test', '/hourly\n', '/auth', '/weather/../../auth', '/radar/../auth', '/%2f%2fevil.test', 'javascript:alert(1)'])('rejects unsafe or unrelated returns: %s', value => {
    expect(getWeatherReturnHref(value)).toBeNull()
  })

  it('falls back to a named place when coordinates are invalid', () => {
    const links = getWeatherJourneyLinks({ location: 'London', coordinates: { lat: NaN, lon: 200 } })
    expect(new URL(links.radar, 'https://example.test').searchParams.get('location')).toBe('London')
    expect(links.hourly).toBe('/hourly?city=London')
  })

  it('preserves canonical city-region-country return links', () => {
    const { forecast } = getWeatherJourneyLinks({ location: 'London, England, GB', coordinates: { lat: 51.5, lon: -0.12 } })
    expect(forecast).toContain('/weather/london--england--gb?')
    expect(getWeatherReturnHref(forecast)).toBe(forecast)
  })
})
