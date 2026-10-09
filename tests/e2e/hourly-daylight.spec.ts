import { test, expect } from './fixtures'
import { stubWeatherApis, stubHomeHubApis, stubRadarApis, dismissWarningTakeoverIfPresent } from '../fixtures/utils'

test.use({ viewport: { width: 1440, height: 1000 }, timezoneId: 'Asia/Tokyo', reducedMotion: 'reduce' })

for (const providerDaylight of [true, false]) {
  test(`Pleasanton hourly icons follow local solar times with provider daylight ${providerDaylight}`, async ({ page }) => {
    await page.clock.setFixedTime(new Date('2026-10-05T00:00:00Z'))
    await stubWeatherApis(page, { cityName: 'Pleasanton', lat: 37.6624, lon: -121.8747 })
    await stubHomeHubApis(page)
    await stubRadarApis(page)
    const times = ['2026-10-04T17:00', '2026-10-04T18:00', '2026-10-04T19:00', '2026-10-04T20:00', '2026-10-04T21:00', '2026-10-04T22:00', '2026-10-04T23:00', '2026-10-05T00:00', '2026-10-05T07:00', '2026-10-05T08:00']
    await page.route('**/api/open-meteo/forecast**', route => route.fulfill({
      json: {
        latitude: 37.6624, longitude: -121.8747,
        timezone: 'America/Los_Angeles', utc_offset_seconds: -25200,
        current: { time: times[0], temperature_2m: 96, weather_code: 0, is_day: 1, wind_speed_10m: 6, wind_direction_10m: 270, relative_humidity_2m: 30, surface_pressure: 1013 },
        daily: {
          time: ['2026-10-04', '2026-10-05'],
          sunrise: ['2026-10-04T07:05', '2026-10-05T07:06'],
          sunset: ['2026-10-04T18:45', '2026-10-05T18:43'],
          temperature_2m_max: [98, 95], temperature_2m_min: [64, 62],
          weather_code: [0, 0], precipitation_probability_max: [1, 1],
        },
        hourly: {
          time: times,
          ...(providerDaylight ? { is_day: [1, 1, 0, 0, 0, 0, 0, 0, 0, 1] } : {}),
          temperature_2m: [96, 93, 85, 81, 78, 76, 75, 72, 65, 68],
          weather_code: times.map(() => 0),
          precipitation_probability: times.map(() => 1),
          wind_speed_10m: times.map(() => 6),
        },
      },
    }))
    await page.goto('/weather/pleasanton-ca?location=37.6624%2C-121.8747')
    await dismissWarningTakeoverIfPresent(page)
    const hourlyLink = page.getByRole('region', { name: 'Next few hours' }).getByRole('link', { name: 'Hourly details', exact: true })
    await expect(hourlyLink).toBeVisible()
    await hourlyLink.click()
    await expect(page).toHaveURL(/\/hourly\?/)
    await expect(page.getByRole('img', { name: 'Weather: Clear (night)', exact: true })).toHaveCount(7)

    for (const [label, night] of [['Sun, Oct 4, 6 PM', false], ['Sun, Oct 4, 7 PM', true], ['Mon, Oct 5, 12 AM', true], ['Mon, Oct 5, 7 AM', true], ['Mon, Oct 5, 8 AM', false]] as const) {
      const details = page.getByRole('button', { name: `Details for ${label}`, exact: true })
      const card = details.locator('..')
      await expect(card.getByRole('img', { name: `Weather: Clear${night ? ' (night)' : ''}`, exact: true })).toHaveCount(1)
    }
    await page.getByText('Your day, hour by hour', { exact: true }).scrollIntoViewIfNeeded()
    await page.evaluate(() => document.fonts.ready)
    await page.locator('.dashboard-surface').filter({ hasText: 'Your day, hour by hour' }).screenshot({ path: test.info().outputPath('pleasanton-daylight.png'), animations: 'disabled' })
  })
}
