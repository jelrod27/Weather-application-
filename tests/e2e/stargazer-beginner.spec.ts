import { test, expect } from './fixtures';
import { stargazerE2eFixture } from '../fixtures/stargazer-e2e-fixture';

const now = Date.parse('2026-09-27T00:00:00Z');
test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(now);
  await page.route('**/api/stargazer?**', route => route.fulfill({ json: {
    ...stargazerE2eFixture(), generatedAt: new Date(now).toISOString(), weatherRetrievedAt: new Date(now).toISOString(),
    darkWindow: { status: 'normal', sunset: new Date(now - 3600000).toISOString(), sunrise: new Date(now + 9 * 3600000).toISOString(), astronomicalDusk: new Date(now).toISOString(), astronomicalDawn: new Date(now + 8 * 3600000).toISOString() },
    location: { lat: 40.7128, lon: -74.006, displayName: 'New York', timezone: 'America/New_York' },
    beginnerNight: { hours: [{ start: now + 3600000, end: now + 7200000, midpoint: now + 5400000,
      weather: { cloudLow: 10, cloudHigh: 20, temperatureLow: 12, temperatureHigh: 14, wind: 8, precipitation: 5, issues: [] },
      targets: [{ id: 'Moon', altitude: 40, azimuth: 90, minAltitude: 30, magnitude: -10 }],
    }] },
  } }));
  await page.goto('/stargazer?lat=40.7128&lon=-74.006&q=New+York');
  await expect(page.getByRole('heading', { name: 'Try this hour' })).toBeVisible();
});
test('moves between beginner and detailed panels without dropping observing context', async ({ page }) => {
  await page.getByRole('link', { name: 'Detailed conditions', exact: true }).click();
  await expect(page.getByRole('tab', { name: /Conditions/i })).toHaveAttribute('aria-selected', 'true');
  await expect(page).toHaveURL(/#conditions$/);
  await page.getByRole('tab', { name: /Start here/i }).click();
  await expect(page.getByRole('heading', { name: 'Try this hour' })).toBeVisible();
  await page.getByRole('tab', { name: /Targets/i }).click();
  await expect(page.getByRole('tab', { name: /Targets/i })).toHaveAttribute('aria-selected', 'true');
});
for (const [theme, width] of [['daybreak', 390], ['daybreak', 1280]] as const) {
  test(`keeps the beginner controls readable at ${width}px in ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(value => localStorage.setItem('weather-edu-theme', value), theme);
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Try this hour' })).toBeVisible();
    await page.getByRole('radio', { name: 'Binoculars', exact: true }).check();
    await expect(page.getByRole('radio', { name: 'Binoculars', exact: true })).toBeChecked();
    await expect(page).toHaveURL(/equipment=binoculars/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: `/tmp/weather-pr6-${theme}-${width}.png`, fullPage: true });
  });
}
