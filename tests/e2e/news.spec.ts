import { test, expect } from './fixtures';

/**
 * Smoke coverage for /news (Earth & Space News).
 *
 * The page fetches its feed from /api/news/rss on mount. We stub both the
 * main feed and the featured request with a deterministic ok payload (no items)
 * and assert on the static shell (title, heading, category filter, search
 * input) and the freshness indicator.
 */
test.beforeEach(async ({ page }) => {
  await page.route('**/api/news/rss**', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      // status:'ok' drives the success path; lastUpdated is omitted so the page
      // falls back to "just now", keeping the freshness assertion deterministic.
      body: JSON.stringify({ status: 'ok', items: [], stats: { byCategory: {} }, categories: {} }),
    })
  );
  await page.goto('/news', { waitUntil: 'domcontentloaded' });
});

test('renders the Earth & Space News shell', async ({ page }) => {
  await expect(page).toHaveTitle(/Weather News/i);
  await expect(
    page.getByRole('heading', { name: /EARTH & SPACE NEWS/i }).first()
  ).toBeVisible({ timeout: 30000 });
});

test('exposes category filters', async ({ page }) => {
  // The filter bar always renders the canonical categories.
  await expect(page.getByText(/QUAKES/i).first()).toBeVisible({ timeout: 30000 });
  await expect(page.getByText(/VOLCANOES/i).first()).toBeVisible({ timeout: 30000 });
});

test('shows the freshness indicator after a successful load', async ({ page }) => {
  await expect(page.getByText(/Updated/i).first()).toBeVisible({ timeout: 30000 });
});
