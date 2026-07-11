import { test, expect } from './fixtures';

/**
 * Smoke coverage for /space-weather.
 *
 * The page fetches 7 NOAA space-weather endpoints in parallel on mount
 * (Promise.allSettled, so individual failures don't block render). We stub
 * them all with minimal payloads for determinism and assert on the static
 * shell heading, which renders independently of the fetch results.
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
});

test('renders the Space Weather shell', async ({ page }) => {
  await expect(page).toHaveTitle(/Space Weather/i);
  await expect(
    page.getByRole('heading', { level: 1, name: /Space Weather Monitor/i }).first()
  ).toBeVisible({ timeout: 30000 });
  await expect(page.getByTestId('space-weather-seo-content')).toBeVisible();
});
