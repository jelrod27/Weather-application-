import { test, expect } from './fixtures';

/**
 * Shell and reliability coverage for /space-weather.
 *
 * The page fetches 7 NOAA space-weather endpoints in parallel on mount
 * (Promise.allSettled, so individual failures don't block render). We stub
 * them with empty payloads by default and override the relevant endpoint in
 * each regression. Wait for hydration before exercising the lazy-loaded tabs.
 */
test.beforeEach(async ({ page }) => {
  await page.route('**/api/space-weather/**', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({}),
    })
  );
  await page.goto('/space-weather', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('status', { name: 'Space weather status' })).toHaveText('UNAVAILABLE');
});

test('renders the Space Weather shell', async ({ page }) => {
  await expect(page).toHaveTitle(/Space Weather/i);
  await expect(
    page.getByRole('heading', { level: 1, name: /Space Weather Monitor/i }).first()
  ).toBeVisible({ timeout: 30000 });
  await expect(page.getByTestId('space-weather-seo-content')).toBeVisible();
});

test('shows unavailable when every condition feed fails', async ({ page }) => {
  await page.route('**/api/space-weather/**', route => route.fulfill({
    status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'Unavailable' }),
  }));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('status', { name: 'Space weather status' })).toHaveText('UNAVAILABLE');
  await expect(page.getByRole('alert').filter({ hasText: 'Unable to load space weather data' })).toBeVisible();
});

test('shows the newest solar wind chart reading', async ({ page }) => {
  await page.route('**/api/space-weather/plasma?*', route => route.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({
      data: [
        { time: new Date(Date.now() - 60_000).toISOString(), speed: 706 },
        { time: new Date(Date.now() - 90 * 60_000).toISOString(), speed: 680 },
      ],
      spacecraft: 'SOLAR1',
    }),
  }));
  await page.getByRole('tab', { name: /Geomagnetic/i }).click();
  const panel = page.getByRole('tabpanel');
  await expect(panel.getByText('706 km/s', { exact: true })).toBeVisible();
  await expect(panel.getByText('680 km/s', { exact: true })).toHaveCount(0);
});

test('recovers the flare timeline after an upstream failure', async ({ page }) => {
  let failed = true;
  await page.route('**/api/space-weather/flares', route => route.fulfill({
    status: failed ? 502 : 200, contentType: 'application/json',
    body: JSON.stringify(failed ? { error: 'Catalog unavailable' } : {
      events: [], summary: { total: 0, byClass: { X: 0, M: 0, C: 0, B: 0 }, strongestFlare: 'None', withCME: 0 },
      updatedAt: new Date().toISOString(),
    }),
  }));
  await page.getByRole('tab', { name: /^Alerts$/i }).click();
  const timeline = page.getByTestId('flare-timeline');
  await expect(timeline.getByRole('alert')).toContainText('NASA flare catalog temporarily unavailable');
  failed = false;
  await timeline.getByRole('button', { name: 'Refresh solar flare catalog' }).click();
  await expect(timeline.getByText('No cataloged flares in the last 7 days')).toBeVisible();
  await expect(timeline.getByRole('alert')).toHaveCount(0);
});
