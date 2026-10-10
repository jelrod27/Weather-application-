import { test, expect } from './fixtures'
import { dismissWarningTakeoverIfPresent, seedFreshWeatherCache, stubHomeHubApis, stubWeatherApis } from '../fixtures/utils'
import type { SkyEstimate } from '../../lib/sky/estimate'

const NOW = Date.parse('2026-10-09T21:20Z')
const SKY_URL = '/read-your-sky?lat=45.5152&lon=-122.6784&label=Portland&tz=America%2FLos_Angeles'
function sky(): SkyEstimate {
  return { fetchedAt: NOW, providerReceivedAt: NOW, timezone: 'America/Los_Angeles',
    current: { time: NOW - 5 * 60_000, total: 76, layers: [68, 12, 42], isDay: true, precipitation: 0, weatherCode: 3, visibility: 20000 },
    hours: [{ time: NOW + 40 * 60_000, total: 60 }, { time: NOW + 100 * 60_000, total: 46 }] }
}

for (const viewport of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
  test.describe(`Read your sky at ${viewport.width}px`, () => {
    test.use({ viewport })
    test('retains the selected forecast through sky, lesson, Atlas, Guide and return', async ({ page }) => {
      await page.clock.setFixedTime(NOW)
      await stubWeatherApis(page, { cityName: 'London', country: 'GB', lat: 51.5, lon: -0.12 })
      await stubHomeHubApis(page)
      await page.route('**/api/read-your-sky?**', route => {
        const url = new URL(route.request().url())
        expect(url.searchParams.get('lat')).toBe('51.5')
        expect(url.searchParams.get('lon')).toBe('-0.12')
        return route.fulfill({ json: { ...sky(), timezone: 'Europe/London' } })
      })
      await page.goto('/weather/london-uk?location=51.5%2C-0.12')
      await dismissWarningTakeoverIfPresent(page)
      await page.getByRole('navigation', { name: /Weather views for London/ }).getByRole('link', { name: 'Read your sky', exact: true }).click()
      await expect(page.getByRole('heading', { name: 'Clouds at more than one height' })).toBeVisible()
      await expect(page.getByRole('region', { name: 'Current sky', exact: true })).toContainText('No precipitation is indicated')
      await expect(page.getByRole('img', { name: /schematic low, middle and high/ })).toContainText('Low 68, middle 12, high 42')
      await expect(page.getByRole('region', { name: 'Two-hour outlook' })).toContainText('46%')
      const weatherHref = await page.getByRole('link', { name: /Back to London/ }).getAttribute('href')
      await page.getByRole('link', { name: 'Learn to compare cloud shapes' }).click()
      await expect(page.getByRole('heading', { name: 'Stratus: a low, even layer' })).toBeVisible()
      await page.getByRole('link', { name: 'Explore the cloud atlas', exact: true }).click()
      await expect(page.getByRole('link', { name: 'Back to Read your sky' })).toBeVisible()
      const skyReturn = await page.getByRole('link', { name: 'Back to Read your sky' }).getAttribute('href')
      await page.getByRole('navigation', { name: 'Breadcrumb' }).getByRole('link', { name: 'Education', exact: true }).click()
      await expect(page.getByRole('link', { name: 'Back to Read your sky' })).toHaveAttribute('href', skyReturn!)
      await page.getByRole('link', { name: 'Cloud Atlas', exact: true }).click()
      await expect(page.getByRole('link', { name: 'Back to Read your sky' })).toHaveAttribute('href', skyReturn!)
      await page.getByRole('navigation', { name: 'cloud guides to read and share' }).getByRole('link').first().click()
      await page.getByRole('link', { name: 'Back to Read your sky' }).click()
      await expect(page.getByRole('heading', { name: 'Clouds at more than one height' })).toBeVisible()
      await page.getByRole('link', { name: /Back to London/ }).click()
      await expect(page).toHaveURL(new RegExp(weatherHref!.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$'))
      const size = await page.evaluate(() => ({ content: document.documentElement.scrollWidth, viewport: innerWidth }))
      expect(size.content).toBeLessThanOrEqual(size.viewport)
    })
  })
}

test.describe('Read your sky recovery and entry', () => {
  for (const offset of [-60_000, 2 * 60 * 60_000]) {
    test(`retains the current estimate and outlook when the device clock differs by ${offset} ms`, async ({ page }) => {
      await page.clock.setFixedTime(NOW + offset)
      await stubHomeHubApis(page)
      await page.route('**/api/read-your-sky?**', route => route.fulfill({ json: sky() }))
      await page.goto(SKY_URL)
      await expect(page.getByRole('heading', { name: 'Clouds at more than one height' })).toBeVisible()
      await expect(page.getByText(/Weather-model estimate/)).toContainText('2:15 PM GMT-7')
      await expect(page.getByRole('region', { name: 'Two-hour outlook' })).toContainText('60%')
      await expect(page.getByRole('region', { name: 'Two-hour outlook' })).toContainText('46%')
      const refresh = page.getByRole('button', { name: 'Refresh estimate' })
      await refresh.click()
      await expect(refresh).toBeEnabled()
      await expect(page.getByRole('heading', { name: 'Clouds at more than one height' })).toBeVisible()
      await expect(page.getByText('General learning example · not your current sky')).not.toBeVisible()
    })
  }

  test('unavailable data is general learning, and keyboard retry obtains the current estimate', async ({ page }) => {
    await page.clock.setFixedTime(NOW)
    await stubHomeHubApis(page)
    let calls = 0
    let available = false
    await page.route('**/api/read-your-sky?**', route => {
      calls++
      return available ? route.fulfill({ json: sky() }) : route.fulfill({ status: 502, json: { error: 'Unavailable' } })
    })
    await page.goto(SKY_URL)
    await expect(page.getByRole('heading', { name: /We don’t have a current sky estimate for Portland/ })).toBeVisible()
    await expect(page.getByText('General learning example · not your current sky')).toBeVisible()
    const beforeRetry = calls
    available = true
    await page.getByRole('button', { name: 'Try again' }).focus()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('heading', { name: 'Clouds at more than one height' })).toBeVisible()
    await expect(page.getByText(/Weather-model estimate/)).toContainText('2:15 PM GMT-7')
    expect(calls).toBeGreaterThan(beforeRetry)
  })

  test('clear night, absent layers, missing outlook and stale responses stay honest', async ({ page }) => {
    await page.clock.setFixedTime(NOW)
    await stubHomeHubApis(page)
    const data = sky()
    Object.assign(data.current, { total: 0, layers: [0, 0, 0], isDay: false })
    await page.route('**/api/read-your-sky?**', route => route.fulfill({ json: data }))
    await page.goto(SKY_URL)
    await expect(page.getByText(/Cloud shapes can be harder to distinguish after dark/)).toBeVisible()
    await expect(page.getByRole('img', { name: /schematic low/ })).toContainText('No cloud in this estimate')
    Object.assign(data.current, { total: 70, layers: [null, null, null] })
    data.hours = []
    await page.getByRole('button', { name: 'Refresh estimate' }).click()
    await expect(page.getByRole('img', { name: /Overall cloud coverage diagram/ })).toBeVisible()
    await expect(page.getByText(/two-hour cloud outlook is unavailable/)).toBeVisible()
    Object.assign(data.current, { total: 80, layers: [0, null, null] })
    await page.getByRole('button', { name: 'Refresh estimate' }).click()
    const partialIllustration = page.getByRole('img', { name: /Overall cloud coverage diagram/ })
    await expect(partialIllustration.getByText('80%', { exact: true })).toBeVisible()
    await expect(partialIllustration.getByText('Layer details incomplete', { exact: true })).toBeVisible()
    data.current.time = NOW - 31 * 60_000
    await page.getByRole('button', { name: 'Refresh estimate' }).click()
    await expect(page.getByText(/too old to describe the sky now/)).toBeVisible()
    await expect(page.getByText('General learning example · not your current sky')).toBeVisible()
  })

  test('retains the sky return through the lesson, Education hub, and encyclopedia card', async ({ page }) => {
    await page.clock.setFixedTime(NOW)
    await stubHomeHubApis(page)
    await page.route('**/api/read-your-sky?**', route => route.fulfill({ json: sky() }))
    await page.goto(SKY_URL)
    await page.getByRole('link', { name: 'Learn to compare cloud shapes' }).click()
    await page.getByRole('link', { name: 'Education hub', exact: true }).click()
    await expect(page.getByRole('link', { name: 'Back to Read your sky' })).toBeVisible()
    const skyReturn = await page.getByRole('link', { name: 'Back to Read your sky' }).getAttribute('href')
    await page.getByRole('link', { name: /^Cloud Atlas Genera, species, varieties/ }).click()
    await expect(page.getByRole('link', { name: 'Back to Read your sky' })).toHaveAttribute('href', skyReturn!)
    await page.getByRole('link', { name: 'Back to Read your sky' }).click()
    await expect(page.getByRole('heading', { name: 'Clouds at more than one height' })).toBeVisible()
    await expect(page).toHaveURL(/lat=45.5152&lon=-122.6784/)
  })

  test('a direct visitor can select a place without device location', async ({ page }) => {
    await page.clock.setFixedTime(NOW)
    await stubHomeHubApis(page)
    await page.route('**/api/weather/geocoding?**', route => route.fulfill({ json: [{ name: 'Portland', state: 'OR', country: 'US', lat: 45.5152, lon: -122.6784 }] }))
    await page.route('**/api/read-your-sky?**', route => route.fulfill({ json: sky() }))
    await page.goto('/read-your-sky?lat=invalid&lon=0&returnTo=https%3A%2F%2Fevil.test')
    await expect(page.getByText('General learning example · not your current sky')).toBeVisible()
    await page.getByTestId('location-search-input').fill('Portland, OR')
    await page.getByRole('button', { name: 'Search for weather' }).click()
    await expect(page).toHaveURL(/lat=45.5152&lon=-122.6784/)
    await expect(page.getByRole('heading', { name: 'Clouds at more than one height' })).toBeVisible()
    await expect(page.getByRole('link', { name: /Back to Portland/ })).toHaveAttribute('href', /location=45.5152%2C-122.6784/)
  })

  test('the main page links to the sky for its selected forecast', async ({ page }) => {
    await page.clock.setFixedTime(NOW)
    const place = { cityName: 'London', country: 'GB', lat: 51.5, lon: 0 }
    await stubWeatherApis(page, place)
    await seedFreshWeatherCache(page, place)
    await stubHomeHubApis(page)
    await page.route('**/api/read-your-sky?**', route => route.fulfill({ json: sky() }))
    await page.goto('/')
    await dismissWarningTakeoverIfPresent(page)
    await page.getByRole('navigation', { name: /Weather views for London/ }).getByRole('link', { name: 'Read your sky', exact: true }).click()
    await expect(page).toHaveURL(/lat=51.5&lon=0/)
    await expect(page.getByRole('heading', { name: 'Clouds at more than one height' })).toBeVisible()
  })
})
