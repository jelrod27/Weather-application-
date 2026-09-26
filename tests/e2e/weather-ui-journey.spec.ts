import { test, expect } from './fixtures'
import { dismissWarningTakeoverIfPresent, stubHomeHubApis, stubRadarApis, stubWeatherApis } from '../fixtures/utils'

for (const viewport of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
  test.describe(`Connected weather views at ${viewport.width}px`, () => {
    test.use({ viewport })

    test('forecast, hourly, radar and a lesson keep the viewed city on the return journey', async ({ page }) => {
      await stubWeatherApis(page, { cityName: 'London', country: 'GB', lat: 51.5, lon: -0.12 })
      await stubHomeHubApis(page)
      await stubRadarApis(page)
      await page.goto('/weather/london-uk?location=51.5%2C-0.12')

      const brief = page.getByRole('region', { name: 'Next few hours' })
      await expect(brief).toContainText('London')
      await expect(brief).toContainText('Precipitation chance')
      await dismissWarningTakeoverIfPresent(page)
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(10)
      await brief.getByRole('link', { name: 'Plan the next few hours' }).click()
      await expect(page).toHaveURL(/\/hourly\?.*lat=51.5&lon=-0.12/)
      const hour = page.getByRole('button', { name: /^Details for/ }).nth(1)
      await hour.focus()
      await page.keyboard.press('Enter')
      await expect(hour).toHaveAttribute('aria-pressed', 'true')
      await expect(page.getByRole('region', { name: 'Selected hour details' })).toBeVisible()

      await page.getByRole('navigation', { name: /Weather views for London/ }).getByRole('link', { name: 'Radar', exact: true }).click()
      await expect(page.getByTestId('radar-top-bar')).toContainText('London')
      await expect(page.getByRole('link', { name: 'Back to hourly' })).toHaveAttribute('href', /\/hourly\?.*lat=51.5&lon=-0.12/)
      await expect(page.getByRole('button', { name: /^(Play|Pause)$/ })).toBeVisible()
      if (viewport.width < 640) await page.getByRole('button', { name: 'Controls', exact: true }).click()
      await page.getByRole('link', { name: 'Read this radar', exact: true }).click()
      await expect(page.getByRole('heading', { name: 'Read the legend before the color' })).toBeVisible()
      await page.getByRole('button', { name: '3. Forecast' }).click()
      await expect(page.getByText(/hour ending at the listed time/)).toBeVisible()
      await page.getByRole('link', { name: 'Back to your weather' }).first().click()
      await page.getByRole('link', { name: 'Back to hourly' }).click()
      await page.getByRole('link', { name: 'Back to forecast', exact: true }).click()
      await expect(page).toHaveURL(/\/weather\/.*location=51.5%2C-0.12/)
      await expect(page.getByRole('heading', { level: 1 })).toContainText('London')
      const size = await page.evaluate(() => ({ content: document.documentElement.scrollWidth, viewport: innerWidth }))
      expect(size.content).toBeLessThanOrEqual(size.viewport)
    })

    test('one travel mode and day choice control the whole outlook', async ({ page }) => {
      await page.route('**/api/travel/corridors**', route => route.fulfill({ json: { corridors: [] } }))
      await page.goto('/travel')
      const mode = page.getByRole('group', { name: 'Travel mode', exact: true })
      const day = page.getByRole('group', { name: 'Day', exact: true })
      await expect(mode).toHaveCount(1)
      await expect(day).toHaveCount(1)
      await mode.getByRole('button', { name: 'Drive', exact: true }).click()
      await day.getByRole('button', { name: 'Tomorrow', exact: true }).click()
      await expect(page.getByRole('heading', { name: 'U.S. driving outlook · Tomorrow' })).toBeVisible()
      await mode.getByRole('button', { name: 'Fly', exact: true }).click()
      await expect(day.getByRole('button', { name: 'Today', exact: true })).toHaveAttribute('aria-pressed', 'true')
      await expect(day.getByRole('button', { name: 'Tomorrow', exact: true })).toBeDisabled()
      await expect(page.getByText(/Future-day flight forecasts are unavailable/)).toBeVisible()
      await expect(page.getByRole('heading', { name: 'U.S. airport conditions · Live' })).toBeVisible()
    })
  })
}
