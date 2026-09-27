import { test, expect } from './fixtures'
import { setupStableApp, setupMockAuth, stubSupabaseProfile, stubWeatherApis, stubHomeHubApis, stubRadarApis, isRemotePreviewTarget } from '../fixtures/utils'
import { getForecastMoonInfo } from '../../lib/weather/forecast-moon'
import { summarizeCorridor, DEFAULT_WEATHER_CONDITIONS } from '../../lib/services/travel-corridor-service'

const userId = '00000000-0000-0000-0000-000000000000'
for (const width of [1280, 390]) {
  test.describe(`Data reliability at ${width}px`, () => {
    test.use({ viewport: { width, height: 900 } })

    test('saved weather retries, preserves dated values, honors wind units and recovers', async ({ page }) => {
      test.skip(isRemotePreviewTarget(), 'Local isolated account fixture')
      await setupStableApp(page)
      await setupMockAuth(page, userId)
      await stubSupabaseProfile(page, { id: userId, username: 'testuser', email: 'test@example.com' })
      await page.route('**/api/notifications/welcome**', route => route.fulfill({ json: { sent: false } }))
      await page.route('**/rest/v1/user_preferences**', route => route.fulfill({ json: { user_id: userId, temperature_unit: 'fahrenheit', wind_unit: 'ms' } }))
      await page.route('**/rest/v1/saved_locations**', route => route.fulfill({ json: [{ id: 'test-location', user_id: userId, city: 'New York', state: 'NY', country: 'US', location_name: 'New York, NY', latitude: 40.71, longitude: -74, is_favorite: false }, { id: 'second-location', user_id: userId, city: 'London', country: 'GB', location_name: 'London', latitude: 51.5, longitude: -.12, is_favorite: false }] }))
      const fetchedAt = new Date().toISOString()
      const weather = { temperature: 70, description: 'clear sky', humidity: 40, windSpeed: 5, icon: '01d', feelsLike: 70, pressure: 1013, visibility: 10, units: 'imperial', windUnit: 'ms', fetchedAt, observedAt: fetchedAt, stale: false }
      let attempts = 0
      await page.route('**/api/dashboard-weather**', route => {
        const params = new URL(route.request().url()).searchParams
        expect(params.get('wind_unit')).toBe('ms')
        if (params.get('lat') === '51.5') return route.fulfill({ json: { ...weather, temperature: 60 } })
        if (params.has('detail')) return route.fulfill({ json: { current: weather, forecast: [], uvIndex: null } })
        attempts++
        return attempts === 1 || attempts === 3
          ? route.fulfill({ status: 502, json: { error: 'Unavailable' } })
          : route.fulfill({ json: { ...weather, temperature: attempts > 3 ? 72 : 70 } })
      })
      await page.route('**/api/weather/air-quality**', route => route.fulfill({ status: 502, json: { error: 'Unavailable' } }))
      await page.goto('/dashboard')
      const panel = page.getByTestId('saved-location-test-location')
      await expect(page.getByTestId('saved-location-second-location').getByText('60°F', { exact: true })).toBeVisible()
      await expect(panel.getByText('Weather data unavailable', { exact: true })).toBeVisible()
      await panel.getByRole('button', { name: 'Retry', exact: true }).click()
      await expect(panel.getByText('70°F', { exact: true })).toBeVisible()
      await expect(panel.getByText('5 m/s', { exact: true })).toBeVisible()
      await panel.getByRole('button', { name: 'Refresh weather data' }).click()
      await expect(panel.getByText(/Showing older weather/)).toBeVisible()
      await expect(panel.getByText('70°F', { exact: true })).toBeVisible()
      await expect(panel.locator('time').first()).toHaveAttribute('dateTime', fetchedAt)
      await panel.getByRole('button', { name: 'Refresh weather data' }).click()
      await expect(panel.getByText('72°F', { exact: true })).toBeVisible()
      await expect(panel.getByText(/Showing older weather/)).toBeHidden()
      await panel.getByText('Click for detailed weather').click()
      await expect(panel.getByText('AQI: Unavailable', { exact: true })).toBeVisible()
      await expect(panel.getByText('UV Index: Unavailable', { exact: true })).toBeVisible()
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      await page.screenshot({ path: `/tmp/weather-reliability-dashboard-${width}.png`, fullPage: true })
    })

    test('latest radar age keeps advancing while paused', async ({ page }) => {
      const now = 1718841600 * 1000 + 15 * 60_000
      await page.clock.install({ time: now })
      await stubRadarApis(page)
      await page.goto('/radar?lat=40.71&lon=-74&label=New%20York')
      const dock = page.getByTestId('radar-player-dock')
      await dock.getByRole('button', { name: 'Latest', exact: true }).click()
      await expect(dock).toContainText('15m ago')
      await page.clock.fastForward(60_000)
      await expect(dock).toContainText('16m ago')
      await expect(dock.getByRole('button', { name: 'Latest', exact: true })).toHaveAttribute('aria-pressed', 'true')
    })

    for (const city of [{ name: 'London', slug: 'london-uk', lat: 51.5, lon: -0.12, zone: 'Europe/London' }, { name: 'New York', slug: 'new-york-ny', lat: 40.71, lon: -74, zone: 'America/New_York' }]) {
      test(`Moon events show the observing night and ${city.name} timezone`, async ({ page }) => {
        const moonPhase = getForecastMoonInfo(city.lat, city.lon, city.zone, new Date('2026-11-01T04:30:00Z'))
        await stubWeatherApis(page, { cityName: city.name, lat: city.lat, lon: city.lon, moonPhase })
        await stubHomeHubApis(page)
        await page.goto(`/weather/${city.slug}?location=${city.lat}%2C${city.lon}`)
        await expect(page.getByText(`${moonPhase.observingNight} · ${city.zone}`, { exact: true })).toBeVisible()
        await expect(page.getByText(`Moonset: ${moonPhase.nextMoonset}`, { exact: true })).toBeVisible()
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      })
    }

    test('travel separates worst hazard, route average and missing coverage', async ({ page }) => {
      const quiet = { ...DEFAULT_WEATHER_CONDITIONS, sampledAt: '2026-09-26T20:00:00Z', timeZone: 'America/Denver' }
      const windy = { ...summarizeCorridor('I-70', [[40,-105], [41,-104], [42,-103]], [quiet, { ...quiet, windGusts: 60 }, null]), path: [[-105,40],[-104,41],[-103,42]] }
      const missing = { ...summarizeCorridor('I-70', [[40,-105]], [null]), path: [[-105,40],[-104,41]] }
      await page.route('**/api/travel/corridors**', route => {
        const forecastDay = Number(new URL(route.request().url()).searchParams.get('day'))
        const corridor = forecastDay === 0 ? windy : missing
        return route.fulfill({ json: { corridors: [corridor], worstCorridors: [corridor], forecastDay, fetchedAt: quiet.sampledAt } })
      })
      await page.goto('/travel')
      await page.getByRole('group', { name: 'Travel mode', exact: true }).getByRole('button', { name: 'Drive', exact: true }).click()
      await expect(page.getByText('CAUTION', { exact: true })).toBeVisible()
      await expect(page.getByText('High winds', { exact: true })).toBeVisible()
      await expect(page.getByText('Route average: 5/100', { exact: true })).toBeVisible()
      await expect(page.getByText(/Coverage: 2 of 3/)).toBeVisible()
      await expect(page.getByText('CLEAR', { exact: true })).toHaveCount(0)
      await page.getByRole('group', { name: 'Day', exact: true }).getByRole('button', { name: 'Tomorrow', exact: true }).click()
      await expect(page.getByText('Data unavailable', { exact: true })).toBeVisible()
      await expect(page.getByText(/Midday forecast samples/)).toBeVisible()
      await expect(page.getByText('ALL CLEAR', { exact: true })).toHaveCount(0)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      await page.screenshot({ path: `/tmp/weather-reliability-travel-${width}.png`, fullPage: true })
    })
  })
}
