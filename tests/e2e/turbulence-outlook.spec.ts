import { test, expect } from './fixtures';
import { stubWeatherApis, stubHomeHubApis, dismissWarningTakeoverIfPresent } from '../fixtures/utils';

const polygon = {
  id: 'west-1', coordinates: [[[-124, 38], [-120, 38], [-120, 42], [-124, 42], [-124, 38]]],
  severity: 'moderate', rawSeverity: 'MOD', hazard: 'TURB-HI', forecastHour: 3,
  issuedAt: '2026-10-04T23:33:00Z', validFrom: '2026-10-05T00:00:00Z', validTo: '2026-10-05T03:00:00Z', baseFt: 24000, topFt: 35000,
};
const data = { polygons: [polygon, { ...polygon, id: 'west-2', forecastHour: 9, validFrom: '2026-10-05T06:00:00Z' }],
  fetchedAt: '2026-10-04T23:40:00Z', source: 'NOAA AWC G-AIRMET', coverage: 'CONUS', status: 'available', rejectedRecords: 0, unavailableForecastHours: [] };

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-04T23:40:00Z'));
  await stubWeatherApis(page);
  await stubHomeHubApis(page);
  // Test interactions without sending automated map pans to public tile servers.
  await page.route(/https:\/\/(tile\.openstreetmap\.org|.*\.basemaps\.cartocdn\.com)\//, route => route.fulfill({
    contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="#eef2f7"/></svg>',
  }));
  await page.route('**/api/aviation/turbulence', route => route.fulfill({ json: { success: true, data } }));
});

for (const mobile of [false, true]) {
  test(`advisory map and controls work on ${mobile ? 'mobile' : 'desktop'}`, async ({ page }) => {
    await page.setViewportSize(mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 });
    await page.goto('/travel/turbulence');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://www.16bitweather.co/travel/turbulence');
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', 'US Turbulence Advisory Map');
    await dismissWarningTakeoverIfPresent(page);
    await expect(page.getByRole('heading', { name: 'US turbulence advisory map' })).toBeVisible();
    await expect(page.getByRole('region', { name: /^US advisory map/ })).toBeVisible();
    await expect(page.locator('.ol-layer canvas').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Area 1 · MOD' })).toBeVisible();
    await page.getByRole('button', { name: 'Area 1 · MOD' }).click();
    await expect(page.getByRole('button', { name: 'Area 1 · MOD' })).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('combobox', { name: 'Altitude', exact: true }).selectOption('5000');
    await expect(page.getByText(/No matching turbulence advisories/)).toBeVisible();
    await page.getByRole('combobox', { name: 'Altitude', exact: true }).selectOption('30000');
    await page.getByRole('combobox', { name: 'Advisory snapshot (UTC)' }).selectOption('2026-10-05T06:00:00Z');
    await expect(page.getByText('Snapshot: Oct 5, 06:00 UTC')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Area 1 · MOD' })).toHaveAttribute('aria-pressed', 'false');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.getByRole('link', { name: '← Travel Hub' }).click();
    await expect(page).toHaveURL(/\/travel$/);
    await page.getByRole('button', { name: 'Fly', exact: true }).click();
    await page.getByRole('link', { name: /US turbulence advisory map/ }).click();
    await expect(page).toHaveURL(/\/travel\/turbulence$/);
  });
}

test('provider failure recovers without suggesting smooth conditions', async ({ page }) => {
  await page.route('**/api/aviation/turbulence', route => route.fulfill({ status: 502, json: { success: false } }));
  await page.goto('/travel/turbulence');
  await dismissWarningTakeoverIfPresent(page);
  await expect(page.getByRole('alert').filter({ hasText: 'Advisories are unavailable' })).toBeVisible();
  await expect(page.getByText(/No matching turbulence advisories/)).toHaveCount(0);
  await page.route('**/api/aviation/turbulence', route => route.fulfill({ json: { success: true, data: { ...data, status: 'partial' } } }));
  await page.getByRole('button', { name: 'Refresh advisories' }).click();
  await expect(page.getByText(/Some advisory data is unavailable/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Area 1 · MOD' })).toBeVisible();
});

test('city search recenters without expanding advisory coverage', async ({ page }) => {
  await page.route('**/api/weather/geocoding?**', route => route.fulfill({ json: [{ name: 'Toronto', lat: 43.65, lon: -79.38, country: 'CA' }] }));
  await page.goto('/travel/turbulence');
  await dismissWarningTakeoverIfPresent(page);
  await page.getByRole('textbox', { name: 'Find a city' }).fill('Toronto');
  await page.getByRole('button', { name: 'Center map', exact: true }).click();
  await expect(page.getByText(/Map centered on Toronto/)).toBeVisible();
  await expect(page.getByLabel('Coverage and interpretation')).toContainText('Canada, Mexico, Alaska and Hawaii are not covered');
  await page.getByRole('button', { name: 'Reset US view' }).click();
  await expect(page.getByText(/Map centered on Toronto/)).toHaveCount(0);
});
