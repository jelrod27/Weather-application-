import { test, expect } from './fixtures';
import { stargazerE2eFixture } from '../fixtures/stargazer-e2e-fixture';

/**
 * Smoke coverage for /stargazer (Stargazer Command Center).
 *
 * The page uses geolocation (falling back to NYC) and fetches an astro
 * forecast on mount. We mock geolocation to return immediately so the test
 * never waits on the 10s permission timeout, stub the data endpoints, and
 * assert on the static shell (title, heading, section tabs, search form).
 */
async function stubStargazerRoutes(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    const coords = { latitude: 40.7128, longitude: -74.006, accuracy: 10 } as GeolocationCoordinates;
    // @ts-expect-error - minimal mock for tests
    navigator.geolocation = {
      getCurrentPosition: (success: PositionCallback) =>
        success({ coords, timestamp: 0 } as GeolocationPosition),
      watchPosition: () => 0,
      clearWatch: () => {},
    };
  });

  await page.route('**/api/stargazer**', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(stargazerE2eFixture()),
    }),
  );
  await page.route('**/api/weather/geocoding**', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
  );
}

test.beforeEach(async ({ page }) => {
  await stubStargazerRoutes(page);
  await page.goto('/stargazer', { waitUntil: 'domcontentloaded' });
});

test('renders the Stargazer Command Center shell', async ({ page }) => {
  await expect(page).toHaveTitle(/Stargazer/i);
  await expect(page.getByTestId('stargazer-page-title')).toBeVisible({ timeout: 30000 });
});

test('exposes the location search form', async ({ page }) => {
  const search = page.getByTestId('stargazer-location-search').first();
  await expect(search).toBeVisible({ timeout: 30000 });
  await expect(page.getByTestId('stargazer-location-go').first()).toBeVisible({ timeout: 30000 });
});

test('prefills location from hub query params', async ({ page }) => {
  await page.goto('/stargazer?lat=33.5779&lon=-101.8552&q=Lubbock%2C%20TX', {
    waitUntil: 'domcontentloaded',
  });
  await expect(page.getByTestId('stargazer-location-search').first()).toHaveValue('Lubbock, TX', {
    timeout: 30000,
  });
});
