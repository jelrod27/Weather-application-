import { test, expect } from './fixtures'
import { stubWeatherApis, stubHomeHubApis, stubRadarApis, dismissWarningTakeoverIfPresent } from '../fixtures/utils'

for (const width of [320, 390, 768, 1024, 1200, 1280, 1440]) {
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
      for (const label of ['UV Index','Feels Like','Humidity','Pressure','Wind','Precipitation','Visibility','Pollen']) {
        await expect(conditions.getByText(label, { exact: true })).toBeVisible()
      }
      await expect(conditions.locator('.weather-metric-card')).toHaveCount(8)
      const sunTimes = page.getByRole('region', { name: 'Sun times', exact: true })
      await expect(sunTimes).toContainText('6:00 am')
      await expect(sunTimes).toContainText('8:00 pm')
      await expect(page.locator('.hero-weather-card')).toContainText('Sunrise')
      await expect(page.locator('.hero-weather-card')).toContainText('Sunset')
      await expect(page.getByText('Your day, hour by hour', { exact: true })).toHaveCount(0)
      await expect(page.getByRole('heading', { name: 'Weather Radar', exact: true })).toHaveCount(0)
      await expect(page.getByRole('region', { name: 'Loading radar map' })).toHaveCount(0)
      await expect(page.locator('.ol-viewport')).toHaveCount(0)
      await page.getByRole('button', { name: 'Learn about Sun Times' }).click()
      await expect(page.getByRole('link', { name: 'Learn more' })).toHaveAttribute('href', '/education/glossary#sun-times')
      await page.keyboard.press('Escape')
      await expect(page.getByRole('heading',{name:'Air Quality',exact:true})).toBeVisible()
      await expect(page.getByText('Moon Phase',{exact:true})).toBeVisible()
      const radarLink = page.getByRole('link', { name:/Explore local radar/ })
      await expect(radarLink).toHaveAttribute('href', /lat=51.5&lon=-0.12/)
      await expect(page.getByRole('heading', { name: 'What can clouds tell you?' })).toHaveCount(0)
      const order = await page.evaluate(() => ({
        metrics: document.querySelector('[aria-label="Current conditions"]')!.getBoundingClientRect().top,
        discovery: document.querySelector('[aria-label="Explore your weather"]')!.getBoundingClientRect().top,
        overflow: document.documentElement.scrollWidth > innerWidth,
      }))
      expect(order.overflow).toBe(false)
      if (width < 1200) expect(order.discovery).toBeGreaterThan(order.metrics)
      await expect(page.getByRole('complementary', { name:'Explore your weather' })).toHaveCount(1)
      const discovery = page.getByRole('complementary', { name:'Explore your weather' })
      const brief = page.getByRole('region', { name: 'Next few hours', exact: true })
      await expect(brief).toHaveCount(1)
      for (const label of ['Temperature', 'Precipitation chance', 'Highest hourly wind']) {
        await expect(brief.getByText(label, { exact: true })).toBeVisible()
      }
      await expect(page.getByText('A little detail. A better plan.', { exact: true })).toHaveCount(0)
      const placement = await brief.evaluate(el => {
        const main = document.querySelector('.weather-layout-main')!
        const hero = main.querySelector('.hero-weather-card')!
        const radar = document.querySelector('.forecast-discovery-card')!
        return {
          inSidebar: Boolean(el.closest('.forecast-discovery')),
          heroNextIsBrief: hero.nextElementSibling === el,
          beforeRadar: el.getBoundingClientRect().bottom <= radar.getBoundingClientRect().top,
          lastInMain: main.lastElementChild === el,
        }
      })
      expect(placement.heroNextIsBrief).toBe(width < 1200)
      expect(placement.inSidebar).toBe(width >= 1200)
      if (width >= 1200) expect(placement.beforeRadar).toBe(true)
      else expect(placement.lastInMain).toBe(true)
      await page.evaluate(() => document.fonts.ready)
      const alignment = await page.evaluate(() => {
        const hero = document.querySelector('.hero-weather-card')!.getBoundingClientRect()
        const sidebar = document.querySelector('.forecast-discovery')!.getBoundingClientRect()
        const air = document.querySelector('.aqi-panel')!.getBoundingClientRect()
        const moonBounds = document.querySelector('[aria-label="Learn about Moon Phase"]')!.closest('.weather-card-enter')!.getBoundingClientRect()
        return {
          sidebarTop: sidebar.top - hero.top,
          sidebarBottom: sidebar.bottom - hero.bottom,
          cardsTop: air.top - moonBounds.top,
          sideBySide: air.right <= moonBounds.left,
          stacked: air.bottom <= moonBounds.top,
        }
      })
      if (width >= 1200) {
        expect(Math.abs(alignment.sidebarTop)).toBeLessThanOrEqual(2)
        expect(Math.abs(alignment.sidebarBottom)).toBeLessThanOrEqual(2)
      }
      if (width >= 1024) {
        expect(Math.abs(alignment.cardsTop)).toBeLessThanOrEqual(2)
        expect(alignment.sideBySide).toBe(true)
      } else expect(alignment.stacked).toBe(true)
      const discoveryBeforeDetails = await discovery.evaluate(el => Boolean(el.compareDocumentPosition(document.querySelector('.weather-layout-details')!) & Node.DOCUMENT_POSITION_FOLLOWING))
      expect(discoveryBeforeDetails).toBe(width >= 1200)
      // Keyboard order moves from radar directly to the first daily forecast on desktop.
      // The forecast is a separate lazy chunk; wait for its focus target before tabbing.
      await expect(page.locator('.forecast-day-card').first()).toBeVisible()
      await radarLink.focus()
      await page.keyboard.press('Tab')
      if (width >= 1200) {
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

for (const theme of ['clear-sky', 'daybreak', 'nord']) {
  test(`long place names and enlarged text keep forecast controls readable in ${theme}`, async ({ page }) => {
    const city = 'Llanfairpwllgwyngyllgogerychwyrndrobwllllantysiliogogogoch'
    await page.addInitScript(value => localStorage.setItem('weather-edu-theme', value), theme)
    await stubWeatherApis(page, {
      cityName: city, country: 'GB', lat: 53.22, lon: -4.20,
      moonPhase: { phase: 'Waning Crescent', illumination: 8, emoji: '', phaseAngle: 330, observingNight: 'Observing night of Oct 9', timeZone: 'Europe/London', nextMoonset: 'Oct 10, 6:10 PM BST', nextFullMoon: 'Oct 26, 4:12 AM GMT' },
    })
    await stubHomeHubApis(page)
    await stubRadarApis(page)
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto('/weather/llanfairpwll?location=53.22%2C-4.2')
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
    await dismissWarningTakeoverIfPresent(page)
    const hero = page.locator('.hero-weather-card')
    const heading = hero.getByRole('heading', { level: 2 })
    await expect(heading).toContainText(city)
    await expect(page.getByText('8% illuminated', { exact: true })).toBeVisible()
    for (const width of [1280, 640, 320]) {
      await page.setViewportSize({ width, height: 900 })
      // 640px also covers the effective CSS viewport of a 1280px window at 200% zoom.
      await expect(page.getByRole('region', { name: 'Sun times' })).toBeVisible()
      await expect(page.getByRole('region', { name: 'Next few hours', exact: true })).toHaveCount(1)
      const bounds = await heading.evaluate(el => {
        const title = el.getBoundingClientRect()
        const card = el.closest('.hero-weather-card')!.getBoundingClientRect()
        return { titleRight: title.right, cardRight: card.right, titleFits: el.scrollWidth <= el.clientWidth, overflow: document.documentElement.scrollWidth > innerWidth }
      })
      expect(bounds.overflow).toBe(false)
      expect(bounds.titleRight).toBeLessThanOrEqual(bounds.cardRight)
      expect(bounds.titleFits).toBe(true)
    }
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.addStyleTag({ content: 'html { font-size: 200% !important; }' })
    await expect(page.getByRole('region', { name: 'Sun times' })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.getByRole('link', { name: /Explore local radar/ }).click()
    await expect(page).toHaveURL(/\/radar\?lat=53.22&lon=-4.2/)
    await expect(page.getByTestId('radar-top-bar')).toContainText(city)
    await page.getByRole('link', { name: 'Back to forecast', exact: true }).click()
    await expect(heading).toContainText(city)
  })
}

test('home forecast keeps one summary when resizing from desktop to mobile', async ({ page, context }) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  await context.setGeolocation({ latitude: 51.5, longitude: -0.12 })
  await context.grantPermissions(['geolocation'])
  await stubWeatherApis(page, { cityName: 'London', country: 'GB', lat: 51.5, lon: -0.12 })
  await stubHomeHubApis(page)
  await stubRadarApis(page)
  await page.goto('/')
  await dismissWarningTakeoverIfPresent(page)
  const brief = page.getByRole('region', { name: 'Next few hours', exact: true })
  await expect(brief).toHaveCount(1)
  await expect(page.locator('.forecast-discovery .forecast-brief')).toHaveCount(1)
  await expect(brief).toContainText('London')
  await expect(page.getByText('Your day, hour by hour', { exact: true })).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Weather Radar', exact: true })).toHaveCount(0)
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(brief).toHaveCount(1)
  await expect(page.locator('.weather-layout-main > .forecast-brief:last-child')).toHaveCount(1)
  await expect(page.locator('.forecast-discovery .forecast-brief')).toHaveCount(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})
