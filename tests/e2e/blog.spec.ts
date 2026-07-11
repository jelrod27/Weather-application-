import { test, expect } from './fixtures';

test('weekly blog renders topic-aligned imagery without generated placeholders', async ({ page }) => {
  await page.goto('/blog/this-week-in-weather-2026-06-14', { waitUntil: 'domcontentloaded' });

  const article = page.locator('article');
  await expect(
    article.getByRole('heading', {
      level: 1,
      name: /This Week in Weather — June 14, 2026: 205 Tornado Warnings/i,
    }),
  ).toBeVisible({ timeout: 30000 });
  await expect(article.getByText(/headline number is 205 tornado warnings/i)).toBeVisible();
  await expect(article.getByAltText(/mesocyclone structure within a supercell/i)).toBeVisible();
  await expect(article.getByAltText(/normal, reverse, and strike-slip fault motion/i)).toBeVisible();
  await expect(article.getByAltText(/GOES-16 mid-level water vapor/i)).toBeVisible();

  await expect(article.getByText(/Current Sun in 193/i)).toHaveCount(0);
  await expect(article.getByText(/Cracked soil from prolonged drought/i)).toHaveCount(0);
  await expect(article.getByText(/Cray-1 supercomputer/i)).toHaveCount(0);
  await expect(article.getByAltText(/500 hPa geopotential height analysis/i)).toHaveCount(0);
  await expect(article.getByAltText(/surface analysis chart for June 19/i)).toHaveCount(0);
});
