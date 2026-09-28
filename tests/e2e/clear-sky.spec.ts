import { test, expect } from './fixtures'
import { stubWeatherApis, stubHomeHubApis, stubRadarApis, dismissWarningTakeoverIfPresent } from '../fixtures/utils'

for (const width of [320, 390, 768, 1024, 1440]) {
  test.describe(`Clear Sky complete forecast at ${width}px`, () => {
    test.use({ viewport: { width, height: 1000 }, contextOptions: { reducedMotion: 'reduce' } })
    test('preserves every condition and the connected forecast tools', async ({ page }) => {
      await stubWeatherApis(page, { cityName: 'London', country: 'GB', lat: 51.5, lon: -0.12 })
      await stubHomeHubApis(page)
      await stubRadarApis(page)
      await page.goto('/weather/london-uk?location=51.5%2C-0.12')
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'clear-sky')
      await dismissWarningTakeoverIfPresent(page)
      const conditions = page.getByRole('region', { name: 'Current conditions' })
      for (const label of ['UV Index','Feels Like','Sun Times','Humidity','Pressure','Wind','Precipitation','Visibility','Pollen']) {
        await expect(conditions.getByText(label, { exact: true })).toBeVisible()
      }
      await expect(conditions.locator('.weather-metric-card')).toHaveCount(9)
      await expect(page.getByRole('heading',{name:'Air Quality',exact:true})).toBeVisible()
      await expect(page.getByText('Moon Phase',{exact:true})).toBeVisible()
      const radarLink = page.getByRole('link', { name:/Explore local radar/ })
      await expect(radarLink).toHaveAttribute('href', /lat=51.5&lon=-0.12/)
      await expect(page.getByRole('link', { name:/Learn to read the sky/ })).toHaveAttribute('href', /returnTo=/)
      const order = await page.evaluate(() => ({
        metrics: document.querySelector('[aria-label="Current conditions"]')!.getBoundingClientRect().top,
        discovery: document.querySelector('[aria-label="Explore your weather"]')!.getBoundingClientRect().top,
        overflow: document.documentElement.scrollWidth > innerWidth,
      }))
      expect(order.overflow).toBe(false)
      if (width < 1200) expect(order.discovery).toBeGreaterThan(order.metrics)
      await expect(page.getByRole('complementary', { name:'Explore your weather' })).toHaveCount(1)
      const discovery = page.getByRole('complementary', { name:'Explore your weather' })
      const discoveryBeforeDetails = await discovery.evaluate(el => Boolean(el.compareDocumentPosition(document.querySelector('.weather-layout-details')!) & Node.DOCUMENT_POSITION_FOLLOWING))
      expect(discoveryBeforeDetails).toBe(width >= 1200)
      // Keyboard order should visit the next discovery link, then the first daily forecast on desktop.
      // The forecast is a separate lazy chunk; wait for its focus target before tabbing.
      await expect(page.locator('.forecast-day-card').first()).toBeVisible()
      await radarLink.focus()
      await page.keyboard.press('Tab')
      await expect(page.getByRole('link', { name:/Learn to read the sky/ })).toBeFocused()
      if (width >= 1200) {
        await page.keyboard.press('Tab')
        await expect(page.locator('.forecast-day-card').first()).toBeFocused()
      }
      await page.evaluate(() => document.fonts.ready)
      await expect.poll(() => page.evaluate(() => Math.max(document.body.scrollWidth, document.documentElement.scrollWidth) <= innerWidth)).toBe(true)
      await page.screenshot({ path: `/tmp/clear-sky-${width}-${test.info().project.name}.png`, fullPage: true })
      const day = page.locator('.forecast-day-card').first()
      await day.click()
      await expect(page.getByText('DETAILED FORECAST', { exact: true })).toBeVisible()
      if (width === 768 || width === 1024) {
        await page.setViewportSize({ width, height: 768 })
        await page.getByRole('button', { name: 'Toggle navigation menu' }).click()
        const menu = page.getByRole('navigation', { name: 'Mobile navigation' })
        const about = menu.getByRole('link', { name: 'ABOUT', exact: true })
        await about.scrollIntoViewIfNeeded()
        const bounds = await about.boundingBox()
        expect(bounds).not.toBeNull()
        expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(768)
        await about.click()
        await expect(page).toHaveURL(/\/about$/)
      }
    })
  })
}

test('a saved Daybreak choice survives a new-default reload', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('weather-edu-theme', 'daybreak'))
  await page.goto('/')
  await expect(page.locator('html')).toHaveAttribute('data-theme','daybreak')
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme','daybreak')
})
