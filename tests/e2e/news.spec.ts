import { test, expect } from './fixtures';

/**
 * Smoke coverage for /news (Earth & Space News).
 *
 * The page fetches its feed from /api/news/rss on mount. We stub both the
 * main feed and the featured request with empty payloads for determinism and
 * assert on the static shell (title, heading, category filter, search input).
 */
test.beforeEach(async ({ page }) => {
  await page.route('**/api/news/rss**', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items: [], articles: [] }),
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
