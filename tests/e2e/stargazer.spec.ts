import { test, expect } from './fixtures';

/**
 * Smoke coverage for /stargazer (Stargazer Command Center).
 *
 * The page uses geolocation (falling back to NYC) and fetches an astro
 * forecast on mount. We mock geolocation to return immediately so the test
 * never waits on the 10s permission timeout, stub the data endpoints, and
 * assert on the static shell (title, heading, section tabs, search form).
 */
test.beforeEach(async ({ page }) => {
  // Resolve geolocation instantly to a fixed point (avoids the 10s fallback wait).
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
      body: JSON.stringify({ conditions: {}, targets: [], events: [], launches: [] }),
    })
  );
  await page.route('**/api/weather/geocoding**', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  );

  await page.goto('/stargazer', { waitUntil: 'domcontentloaded' });
});

test('renders the Stargazer Command Center shell', async ({ page }) => {
  await expect(page).toHaveTitle(/Stargazer/i);
  await expect(
    page.getByRole('heading', { name: /STARGAZER COMMAND CENTER/i }).first()
  ).toBeVisible({ timeout: 30000 });
});

test('exposes the location search form', async ({ page }) => {
  // The search form renders unconditionally (above the loading/data gates),
  // so it is a stable shell assertion independent of the forecast payload.
  await expect(page.getByLabel(/Search location/i)).toBeVisible({ timeout: 30000 });
  await expect(page.getByRole('button', { name: /^Go$/i })).toBeVisible();
});
