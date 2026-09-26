import { test, expect } from './fixtures'
import { dismissWarningTakeoverIfPresent, stubHomeHubApis, stubWeatherApis } from '../fixtures/utils'

const transparentPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
)

const expires = new Date(Date.now() + 3600_000).toISOString()
const sent = new Date().toISOString()

const covering = {
  id: 'cover-nyc',
  event: 'Tornado Warning',
  severity: 'Extreme',
  headline: 'Tornado Warning for New York',
  areaDesc: 'New York County',
  ugc: ['NYC061'],
  urgency: 'Immediate',
  expires,
  sent,
  effective: sent,
  ends: expires,
  description: 'A tornado is on the ground.',
  instruction: 'Take shelter now.',
  certainty: 'Observed',
  response: 'Shelter',
  sender: 'NWS',
  hazard: { maxHail: null, maxWind: null, source: null, damageThreat: null },
  geometry: {
    type: 'Polygon',
    coordinates: [[[-74.2, 40.6], [-73.8, 40.6], [-73.8, 40.9], [-74.2, 40.9], [-74.2, 40.6]]],
  },
}

const nearbyCell = {
  ...covering,
  id: 'near-nyc',
  event: 'Severe Thunderstorm Warning',
  severity: 'Severe',
  headline: 'Severe Thunderstorm Warning north of the pin',
  areaDesc: 'Westchester County',
  geometry: {
    type: 'Polygon',
    coordinates: [[[-74.2, 41.0], [-73.8, 41.0], [-73.8, 41.3], [-74.2, 41.3], [-74.2, 41.0]]],
  },
}

const elsewhereCell = {
  ...covering,
  id: 'far-dallas',
  event: 'Flash Flood Warning',
  severity: 'Severe',
  headline: 'Flash Flood Warning for Dallas',
  areaDesc: 'Dallas County',
  geometry: {
    type: 'Polygon',
    coordinates: [[[-97.0, 32.6], [-96.6, 32.6], [-96.6, 32.9], [-97.0, 32.9], [-97.0, 32.6]]],
  },
}

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

  await page.route('**/api/weather/alerts**', async (route) => {
    const url = new URL(route.request().url())
    if (url.searchParams.get('detail') === '1' || url.searchParams.get('harm') === '1') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          alerts: [elsewhereCell, nearbyCell, covering],
          wis: {
            score: 72,
            level: 'red',
            label: 'Severe',
            activeWarnings: 3,
            activeWatches: 0,
            activeAdvisories: 0,
            totalAlerts: 3,
            nwsWarnings: 3,
            nwsWatches: 0,
            nwsAdvisories: 0,
          },
          total: 3,
        }),
      })
    }
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ type: 'FeatureCollection', features: [] }),
    })
  })

  await page.route('**/api/weather/storm-reports**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ reports: [], total: 0, days: 2 }),
    }),
  )

  await page.route('**/api/storm-reports**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ reports: [] }),
    }),
  )

  await page.route('**/basemaps.cartocdn.com/**', (route) =>
    route.fulfill({ status: 200, contentType: 'image/png', body: transparentPng }),
  )

  await page.route('**/api/weather/iowa-nexrad**', (route) =>
    route.fulfill({ status: 200, contentType: 'image/png', body: transparentPng }),
  )

  await page.goto('/warnings', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('[data-testid^="warning-lane-"]').getByText('Tornado Warning', { exact: true }).first()).toBeVisible()
})

test('warning center exposes a pin setter and local lanes', async ({ page }) => {
  const main = page.getByRole('main')
  await expect(page.getByRole('heading', { name: /Warning center/i }).first()).toBeVisible({
    timeout: 30000,
  })
  await expect(main.getByTestId('warning-pin-search')).toBeVisible()
  await expect(main.getByTestId('warning-event-filter')).toBeVisible()
  await expect(main.getByTestId('warning-state-filter')).toBeVisible()
  await expect(main.getByTestId('warning-lane-on-you')).toBeVisible({ timeout: 20000 })
  await expect(main.getByTestId('warning-lane-nearby')).toBeVisible()
  await expect(main.getByTestId('warning-lane-elsewhere-in-the-us')).toBeVisible()
})

test('setting a pin ranks covering warnings on you and close cells nearby', async ({ page }) => {
  const main = page.getByRole('main')
  const input = main.getByTestId('warning-pin-input')
  await expect(input).toBeVisible({ timeout: 30000 })
  await input.fill('New York, NY')
  await expect(input).toHaveValue('New York, NY')
  const setPin = main.getByRole('button', { name: /Set pin/i })
  await expect(setPin).toBeEnabled()
  await setPin.click()

  await dismissWarningTakeoverIfPresent(page)

  await expect(main.getByTestId('warning-pin-status')).toContainText(/^Viewing warnings for: New York, NY/i, {
    timeout: 15000,
  })
  await expect(main.getByTestId('warning-lane-on-you').getByText('Tornado Warning')).toBeVisible()
  await expect(main.getByTestId('warning-lane-nearby').getByText('Severe Thunderstorm Warning')).toBeVisible()
  await expect(main.getByTestId('warning-lane-elsewhere-in-the-us').getByText('Flash Flood Warning')).toBeVisible()
})

test('selected warning opens radar with its geometry and preserves the desk return', async ({ page }) => {
  await page.goto('/warnings?state=NY&event=Tornado+Warning&alert=cover-nyc', { waitUntil: 'domcontentloaded' });
  const main = page.getByRole('main');
  await expect(main.getByTestId('warning-state-filter')).toHaveValue('NY');
  await expect(main.getByTestId('warning-event-filter')).toHaveValue('Tornado Warning');
  const radarLink = main.getByRole('link', { name: 'Open radar for this polygon' });
  await expect(radarLink).toBeVisible();
  await expect(main.getByRole('link', { name: 'Official NWS alert' })).toHaveAttribute('href', 'https://api.weather.gov/alerts/cover-nyc');
  await radarLink.click();
  await expect(page).toHaveURL(/\/radar\?.*warning=cover-nyc/);
  await expect(page.getByText('Tornado Warning — New York County', { exact: true })).toBeVisible();
  const back = page.getByRole('link', { name: 'Back to warning' });
  const href = await back.getAttribute('href');
  const returnTo = new URL(href!, 'http://localhost').searchParams.get('returnTo');
  expect(returnTo).toContain('state=NY');
  expect(returnTo).toContain('event=Tornado+Warning');
  expect(returnTo).toContain('alert=cover-nyc');
});
