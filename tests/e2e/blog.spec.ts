import { test, expect } from './fixtures';

test('weekly blog renders topic-aligned imagery without generated placeholders', async ({ page }) => {
  await page.goto('/blog/this-week-in-weather-2026-06-14', { waitUntil: 'domcontentloaded' });

  await expect(page.locator('article h1').filter({ hasText: /This Week in Weather/i })).toBeVisible({
    timeout: 30000,
  });

  const article = page.locator('article');
  await expect(article.getByText(/205 tornado warnings/i)).toBeVisible();
  await expect(article.getByAltText(/mesocyclone structure within a supercell/i)).toBeVisible();
  await expect(article.getByAltText(/GOES-16 mid-level water vapor/i)).toBeVisible();
  await expect(article.getByAltText(/Atlantic surface analysis/i)).toBeVisible();

  await expect(article.getByText(/Current Sun in 193/i)).toHaveCount(0);
  await expect(article.getByText(/Cracked soil from prolonged drought/i)).toHaveCount(0);
  await expect(article.getByText(/Cray-1 supercomputer/i)).toHaveCount(0);
  await expect(article.getByAltText(/500 hPa geopotential height analysis/i)).toHaveCount(0);
  await expect(article.getByAltText(/surface analysis chart for June 19/i)).toHaveCount(0);
});
