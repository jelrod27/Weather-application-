import { test, expect } from './fixtures';

for (const timezoneId of ['America/Los_Angeles', 'Asia/Tokyo']) {
  test.describe(`blog dates in ${timezoneId}`, () => {
    test.use({ timezoneId });

    test('keeps server dates after hydration without rendering warnings', async ({ page }) => {
      const renderingErrors: string[] = [];
      const hydrationPattern = /hydration|hydrated|server rendered|React error #418/i;
      page.on('pageerror', error => {
        if (hydrationPattern.test(error.message)) renderingErrors.push(error.message);
      });
      page.on('console', message => {
        if (message.type() === 'error' && hydrationPattern.test(message.text())) {
          renderingErrors.push(message.text());
        }
      });
      // A successful React event confirms hydration finished, without requiring
      // clipboard permissions or writing to the test machine's clipboard.
      await page.addInitScript(() => {
        Object.defineProperty(navigator, 'clipboard', {
          configurable: true,
          value: { writeText: async () => {} },
        });
      });

      for (const path of ['/blog', '/blog/this-week-in-weather-2026-11-16']) {
        const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
        expect(response?.ok()).toBe(true);
        const html = await response!.text();
        const serverDates = Array.from(
          html.matchAll(/<span>([A-Z]+ \d{1,2}, \d{4})<\/span>/g),
          match => match[1],
        );
        expect(serverDates.length).toBeGreaterThan(0);

        await expect(async () => {
          await page.getByRole('button', { name: 'Copy link', exact: true }).first().click();
          await expect(page.getByRole('button', { name: 'Copied', exact: true }).first())
            .toBeVisible({ timeout: 1000 });
        }).toPass({ timeout: 15000 });

        const clientDates = (await page.locator('main span').allTextContents())
          .filter(text => /^[A-Z]+ \d{1,2}, \d{4}$/.test(text));
        expect(clientDates).toEqual(serverDates);
        if (path !== '/blog') expect(clientDates).toContain('NOVEMBER 16, 2026');
        expect(renderingErrors).toEqual([]);
      }
    });
  });
}

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
