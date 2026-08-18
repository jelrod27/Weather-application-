import { test, expect } from './fixtures'
import { stubHomeHubApis, stubWeatherApis } from '../fixtures/utils'

test.beforeEach(async ({ page }) => {
  await stubWeatherApis(page)
  await stubHomeHubApis(page)
  await page.route('**/api/weather/geocoding**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([{ name: 'New York', lat: 40.7128, lon: -74.006, country: 'US', state: 'NY' }]),
    }),
  )
  await page.goto('/alerts', { waitUntil: 'domcontentloaded' })
})

test('Bitwatch landing exposes GPS pin search and guest signup', async ({ page }) => {
  const main = page.getByRole('main')
  await expect(page.getByTestId('bitwatch-landing')).toBeVisible({ timeout: 30000 })
  await expect(page.getByRole('heading', { name: /Free NWS warning alerts/i })).toBeVisible()
  await expect(main.getByTestId('warning-pin-search')).toBeVisible()
  await expect(main.getByRole('button', { name: /Use my location/i })).toBeVisible()
  await expect(main.getByTestId('bitwatch-signup')).toBeVisible()
  await expect(main.getByText('Tornado Warning')).toBeVisible()
  await expect(main.getByText(/not an all-clear/i)).toBeVisible()
})
