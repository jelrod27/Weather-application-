import { getForecastMoonInfo } from '@/lib/weather/forecast-moon'
import { calculateDarkWindow, calculateMoonInfo } from '@/lib/stargazer/astronomy'
it.each([
  [40.7128, -74.006, 'America/New_York', '2026-11-01T04:30Z'],
  [51.5, -0.12, 'Europe/London', '2026-10-25T00:30Z'],
  [78.2, 15.6, 'Arctic/Longyearbyen', '2026-12-21T18:00Z'],
] as const)('matches Stargazer events and observing night at %s,%s', (lat, lon, timeZone, iso) => {
  const at = new Date(iso)
  const night = calculateDarkWindow(lat, lon, at)
  const expected = calculateMoonInfo(lat, lon, night)
  const actual = getForecastMoonInfo(lat, lon, timeZone, at)
  expect(actual.moonsetAt).toBe(expected.set?.toISOString() ?? null)
  expect(actual.phase).toBe(expected.phaseName)
  expect(actual.illumination).toBe(Math.round(expected.illumination))
  expect(actual.timeZone).toBe(timeZone)
  expect(actual.observingNight).toContain(night.astronomicalDusk.toLocaleDateString('en-US', { timeZone, month: 'short', day: 'numeric' }))
  if (expected.set) expect(actual.nextMoonset).toContain(expected.set.toLocaleTimeString('en-US', { timeZone, hour: 'numeric', minute: '2-digit' }))
  else expect(actual.nextMoonset).toMatch(/no moonset/i)
})
it('shows no invented moonset at the pole when the Moon stays above or below the horizon', () => {
  const moon = getForecastMoonInfo(90, 0, 'UTC', new Date('2026-12-21T12:00Z'))
  expect(moon.moonsetAt).toBeNull()
  expect(moon.nextMoonset).toMatch(/no moonset/i)
})
