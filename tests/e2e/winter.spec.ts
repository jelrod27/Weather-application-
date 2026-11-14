import { test, expect } from './fixtures'
import { winterLocalFixture, winterOutlookFixture } from '../fixtures/winter'
import type { Page } from '@playwright/test'
import type { WinterMapSelection } from '@/lib/winter/types'

async function stubWinter(page: Page): Promise<void> {
  await page.route('**/api/winter/outlook**', route => {
    const params = new URL(route.request().url()).searchParams
    const selection: WinterMapSelection = {
      product: (params.get('product') ?? 'snow') as WinterMapSelection['product'],
      day: Number(params.get('day') ?? 1) as WinterMapSelection['day'],
      threshold: Number(params.get('threshold') ?? 4) as WinterMapSelection['threshold'],
    }
    return route.fulfill({ json: winterOutlookFixture(selection) })
  })
  await page.route('**/api/winter/forecast**', route => route.fulfill({ json: winterLocalFixture() }))
  await page.route('**/api/weather/alerts**', route => route.fulfill({ json: { alerts: [], freshness: { status: 'fresh' } } }))
  await page.route('**/api/weather/geocoding**', route => route.fulfill({ json: [{ name: 'Denver', state: 'CO', country: 'US', lat: 39.7392, lon: -104.9903 }] }))
}

test.describe('full Winter forecasting', () => {
  test.beforeEach(async ({ page }) => { await stubWinter(page) })

  test('renders current regional contours and accessible map controls', async ({ page }) => {
    const geographyRequested = page.waitForRequest(request => request.url().startsWith('https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer/tile/'))
    await page.goto('/winter')
    await geographyRequested
    await expect(page.getByRole('heading', { name: 'National winter outlook' })).toBeVisible()
    await expect(page.getByTestId('winter-map-status')).toContainText('Official regional forecast contours shown')
    await expect(page.getByTestId('winter-map-canvas').locator('canvas').first()).toBeVisible()
    await page.getByRole('button', { name: 'Zoom in winter map' }).click()
    await page.getByRole('button', { name: 'Reset view of winter map to national extent' }).click()
    await expect(page.getByRole('button', { name: 'Reset view of winter map to national extent' })).toBeFocused()
    await expect(page.getByRole('list', { name: 'Map legend' })).toContainText('40–69%')
  })

  test('switches snowfall thresholds, day, icing and impact categories without conflating them', async ({ page }) => {
    await page.goto('/winter')
    await page.getByRole('button', { name: '8 inches', exact: true }).click()
    await page.getByRole('button', { name: 'Day 3', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Chance of exceeding 8 inches of snow' })).toBeVisible()
    await page.getByRole('button', { name: 'Ice probability', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Chance of exceeding 0.25 inches of ice' })).toBeVisible()
    await page.getByRole('button', { name: 'Winter impacts', exact: true }).click()
    await expect(page.getByRole('list', { name: 'Map legend' })).toContainText('Moderate impacts')
    await expect(page.getByRole('button', { name: 'Day 3', exact: true })).toHaveAttribute('aria-pressed', 'true')
  })

  test('searches without an account and presents bounded amounts, hourly conditions and source narrative', async ({ page }) => {
    await page.goto('/winter')
    await page.getByLabel('US city or ZIP code', { exact: true }).fill('Denver, CO')
    await page.getByRole('button', { name: 'Search', exact: true }).click()
    await page.getByRole('button', { name: 'Denver, CO, US' }).click()
    await expect(page).toHaveURL(/lat=39.7392/)
    const local = page.getByTestId('winter-local-forecast')
    await expect(local).toContainText('1.25 in')
    await expect(local).toContainText('0.10 in')
    await local.getByText('Show snow forecast periods', { exact: true }).click()
    await expect(local.getByText(/Ongoing: full interval amount/)).toBeVisible()
    await expect(local).toContainText('New snow accumulation of 1 to 3 inches possible.')
    await local.getByText(/Hourly conditions ·/).click()
    await expect(local.getByRole('table', { name: /NWS hourly forecast/ })).toContainText('28°F')
    await expect(local).toContainText('70%')
  })

  test('restores a shared place and preserves unknown ice instead of displaying zero', async ({ page }) => {
    await page.route('**/api/winter/forecast**', route => {
      const forecast = winterLocalFixture()
      forecast.ice = { status: 'unavailable', blocks: [], total: { inches: null, startTime: null, endTime: null, includedPeriods: 0, complete: false }, issues: ['Ice accumulation is unavailable.'] }
      return route.fulfill({ json: forecast })
    })
    await page.goto('/winter?lat=39.7392&lon=-104.9903&place=Denver%2C%20CO')
    const ice = page.getByRole('region', { name: 'Ice accumulation', exact: true })
    await expect(ice).toContainText('Unknown')
    await expect(ice).not.toContainText('0.00 in')
    await expect(page.getByTestId('winter-map-status')).toContainText('Denver, CO')
  })

  test('invalid shared coordinates do not trigger a local forecast request', async ({ page }) => {
    let localRequests = 0
    page.on('request', request => { if (request.url().includes('/api/winter/forecast')) localRequests++ })
    await page.goto('/winter?lat=NaN&lon=-104.99')
    await expect(page.getByText(/shared location has invalid coordinates/i)).toBeVisible()
    await expect(page.getByTestId('winter-map-status')).toContainText('Official regional forecast contours shown')
    expect(localRequests).toBe(0)
  })

  test('an alerts outage never appears as no active winter alerts', async ({ page }) => {
    await page.route('**/api/weather/alerts**', route => route.fulfill({ status: 503, json: { error: 'Upstream unavailable' } }))
    await page.goto('/winter')
    await expect(page.getByText(/Winter alerts unavailable/)).toBeVisible()
    await expect(page.getByText(/No active winter alerts/)).toHaveCount(0)
  })

  test('expired regional forecasts hide contours and explain the source state', async ({ page }) => {
    await page.route('**/api/winter/outlook**', route => {
      const snapshot = winterOutlookFixture({ product: 'snow', day: 1, threshold: 4 })
      snapshot.validFrom = new Date(Date.now() - 24 * 3_600_000).toISOString()
      snapshot.validTo = new Date(Date.now() - 60_000).toISOString()
      return route.fulfill({ json: snapshot })
    })
    await page.goto('/winter')
    await expect(page.getByText(/Outlook expired/)).toBeVisible()
    await expect(page.getByTestId('winter-map-status')).not.toContainText('Official regional forecast contours shown')
  })

  test('unsupported places have an explicit coverage message', async ({ page }) => {
    await page.route('**/api/winter/forecast**', route => route.fulfill({ json: { ...winterLocalFixture(), status: 'outside_coverage', coverage: 'unsupported' } }))
    await page.goto('/winter?lat=61.2&lon=-149.9&place=Anchorage')
    await expect(page.getByText(/Local winter forecasting currently supports the contiguous United States/)).toBeVisible()
    await expect(page.getByRole('region', { name: 'Snow accumulation', exact: true })).toHaveCount(0)
  })

  test('mobile layout keeps controls reachable and has no page overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/winter')
    await expect(page.getByTestId('winter-map-status')).toContainText('Official regional forecast contours shown')
    await page.getByRole('button', { name: 'Winter impacts', exact: true }).click()
    await expect(page.getByRole('list', { name: 'Map legend' })).toContainText('Moderate impacts')
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    const mapBottom = await page.getByTestId('winter-map').evaluate(element => element.getBoundingClientRect().bottom)
    const legendTop = await page.getByRole('list', { name: 'Map legend' }).evaluate(element => element.getBoundingClientRect().top)
    expect(legendTop).toBeGreaterThanOrEqual(mapBottom)
  })
})
