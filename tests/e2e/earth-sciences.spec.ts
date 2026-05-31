import { test, expect } from './fixtures';

/**
 * Smoke coverage for /earth-sciences (live global earthquakes).
 *
 * The client fetches /api/earth-sciences/earthquakes on mount and on filter
 * change. The page exposes stable data-testids for its loading / empty /
 * populated states, so we drive both an empty and a populated response and
 * assert the corresponding state plus the static shell (heading, filters).
 */
const SAMPLE_QUAKE = {
  magnitude: 5.2,
  location: '120km SW of Testville',
  time: '2026-05-01T00:00:00.000Z',
  depth: 10,
  id: 'test-quake-1',
  url: 'https://earthquake.usgs.gov/test',
  latitude: 1.23,
  longitude: 4.56,
  tsunami: false,
};

test.describe('empty state', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/earth-sciences/earthquakes**', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ earthquakes: [], count: 0, minMagnitude: 2.5 }),
      })
    );
    await page.goto('/earth-sciences', { waitUntil: 'domcontentloaded' });
  });

  test('renders the shell and magnitude filters', async ({ page }) => {
    await expect(page).toHaveTitle(/Earth Sciences/i);
    await expect(
      page.getByRole('heading', { name: /Recent Earthquakes/i }).first()
    ).toBeVisible({ timeout: 30000 });
    await expect(page.getByText(/M2\.5\+/i).first()).toBeVisible({ timeout: 30000 });
    await expect(page.getByText(/M4\.5\+/i).first()).toBeVisible();
    await expect(page.getByText(/M6\+/i).first()).toBeVisible();
  });

  test('shows the empty state when no quakes are returned', async ({ page }) => {
    await expect(page.getByTestId('earthquakes-empty')).toBeVisible({ timeout: 30000 });
  });
});

test.describe('populated state', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/earth-sciences/earthquakes**', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ earthquakes: [SAMPLE_QUAKE], count: 1, minMagnitude: 2.5 }),
      })
    );
    await page.goto('/earth-sciences', { waitUntil: 'domcontentloaded' });
  });

  test('renders quake rows when data is returned', async ({ page }) => {
    await expect(page.getByTestId('earthquakes-tbody')).toBeVisible({ timeout: 30000 });
    await expect(page.getByText(/Testville/i).first()).toBeVisible({ timeout: 30000 });
  });
});
