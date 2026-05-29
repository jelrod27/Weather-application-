import { test, expect } from './fixtures';

/**
 * Smoke coverage for /travel (Travel Hub).
 *
 * The page is a client component that lazily fetches corridor forecasts.
 * We stub that endpoint with an empty payload so the test is deterministic
 * and assert on the static shell (title, heading, Fly/Drive controls) that
 * renders independently of fetch state.
 */
test.beforeEach(async ({ page }) => {
  await page.route('**/api/travel/corridors**', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ corridors: [] }),
    })
  );
  await page.goto('/travel', { waitUntil: 'domcontentloaded' });
});

test('renders the Travel Hub shell', async ({ page }) => {
  await expect(page).toHaveTitle(/Travel Weather/i);
  await expect(
    page.getByRole('heading', { name: /Travel Hub/i }).first()
  ).toBeVisible({ timeout: 30000 });
});

test('exposes Fly and Drive mode controls', async ({ page }) => {
  const modeTabs = page.getByRole('tablist', { name: /Travel mode/i });
  await expect(modeTabs).toBeVisible({ timeout: 30000 });
  await expect(modeTabs.getByRole('tab', { name: /Fly/i })).toBeVisible();
  await expect(modeTabs.getByRole('tab', { name: /Drive/i })).toBeVisible();
});
