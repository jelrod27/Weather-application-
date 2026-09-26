import { test, expect } from './fixtures';
import { dismissWarningTakeoverIfPresent, stubHomeHubApis, stubWeatherApis } from '../fixtures/utils';
import type { Page } from '@playwright/test';

const NOW = '2026-09-26T08:15:00Z';

async function stubPlannerForecast(page: Page, state: 'complete' | 'missing' | 'storm' | 'stale' | 'dst' = 'complete'): Promise<void> {
  const date = state === 'dst' ? '2026-10-24' : '2026-09-26';
  await page.clock.setFixedTime(state === 'dst' ? `${date}T08:15:00Z` : NOW);
  await stubWeatherApis(page, { cityName: 'London', country: 'GB', lat: 51.5, lon: -0.12 });
  await stubHomeHubApis(page);
  await page.route('**/api/weather/geocoding**', route => route.fulfill({ json: [
    { name: 'London', state: 'England', country: 'GB', lat: 51.5, lon: -0.12 },
  ] }));
  await page.route('**/api/open-meteo/forecast**', route => {
    const metric = new URL(route.request().url()).searchParams.get('temperature_unit') === 'celsius';
    const time = Array.from({ length: 48 }, (_, i) => new Date(
      Date.parse(`${date}T09:00:00Z`) + (i - (state === 'stale' ? 72 : 0)) * 3600000,
    ).toISOString().slice(0, 16));
    return route.fulfill({ json: {
      latitude: 51.5, longitude: -0.12, timezone: 'Europe/London', utc_offset_seconds: 3600,
      current: { time: `${date}T09:15`, temperature_2m: metric ? 20 : 68, relative_humidity_2m: 60, weather_code: 2, wind_speed_10m: 5, surface_pressure: 1015 },
      daily: { time: [date], temperature_2m_max: [metric ? 22 : 72], temperature_2m_min: [metric ? 14 : 57], weather_code: [2], sunrise: [`${date}T06:00`], sunset: [`${date}T19:00`] },
      hourly: { time, temperature_2m: time.map(() => metric ? 20 : 68), wind_speed_10m: time.map(() => 0),
        precipitation_probability: time.map(() => state === 'missing' ? null : 0), weather_code: time.map(() => state === 'storm' ? 95 : 2) },
    } });
  });
}

test('keeps planner, hourly labels and day markers aligned after the clocks change', async ({ page }) => {
  // Open-Meteo uses the response's single UTC offset even across a DST boundary.
  await stubPlannerForecast(page, 'dst');
  await page.goto('/hourly?city=London&lat=51.5&lon=-0.12');
  const planner = page.getByRole('region', { name: 'Plan time outdoors' });
  await planner.getByRole('button', { name: 'Tomorrow', exact: true }).click();
  await expect(planner.getByText(/6:00 AM.*8:00 AM/)).toBeVisible();
  await planner.getByRole('link', { name: 'View hourly readings' }).first().click();
  await expect(page.getByRole('region', { name: 'Selected hour details' }).getByRole('heading')).toContainText('Sun, Oct 25, 6:00 AM');
  const selected = page.locator('.hourly-forecast-card').filter({ has: page.getByRole('button', { name: /^Details for Sun, Oct 25, 6 AM/ }) });
  await expect(selected.getByText('6 AM', { exact: true })).toBeVisible();
  await expect(selected.getByRole('button')).toHaveAttribute('aria-pressed', 'true');
  const midnight = page.locator('.hourly-forecast-card').filter({ has: page.getByRole('button', { name: /^Details for Mon, Oct 26, 12 AM/ }) });
  await expect(midnight.getByText('12 AM', { exact: true })).toHaveCount(1);
  await expect(midnight.getByText('Mon', { exact: true })).toHaveCount(1);
});

for (const width of [390, 1280]) {
  test.describe(`Outdoor planning at ${width}px`, () => {
    test.use({ viewport: { width, height: 900 }, timezoneId: 'America/Los_Angeles' });

    test('forecast to tomorrow’s outing to hourly details preserves place and keyboard focus', async ({ page }, testInfo) => {
      await stubPlannerForecast(page);
      await page.goto('/weather/london-uk?location=51.5%2C-0.12');
      await dismissWarningTakeoverIfPresent(page);
      await page.getByRole('link', { name: 'Compare outdoor windows' }).click();
      await expect(page).toHaveURL(/\/hourly\?.*lat=51.5&lon=-0.12.*#outdoor-planner/);
      const planner = page.getByRole('region', { name: 'Plan time outdoors' });
      await expect(planner.getByRole('article')).toHaveCount(3);
      await expect(planner.getByRole('status')).toContainText('Saturday, Sep 26');
      await expect(planner.getByText(/10:00 AM.*12:00 PM/)).toBeVisible();
      await planner.getByRole('button', { name: 'Tomorrow', exact: true }).focus();
      await page.keyboard.press('Enter');
      await expect(planner.getByRole('status')).toContainText('Sunday, Sep 27');
      await planner.getByRole('button', { name: '1 hour', exact: true }).click();
      await expect(planner.getByText(/6:00 AM.*7:00 AM/)).toBeVisible();
      await page.screenshot({ path: testInfo.outputPath('outdoor-planner.png'), fullPage: true });
      const details = planner.getByRole('link', { name: 'View hourly readings' }).first();
      await details.focus();
      await page.keyboard.press('Enter');
      const selected = page.getByRole('region', { name: 'Selected hour details' });
      await expect(selected).toBeFocused();
      await expect(selected.getByRole('heading')).toContainText('Sun, Sep 27, 6:00 AM');
      const hour = page.getByRole('button', { name: /^Details for Sun, Sep 27, 6 AM/ });
      await expect(hour).toHaveAttribute('aria-pressed', 'true');
      await expect(hour).toBeInViewport();
      const size = await page.evaluate(() => ({ content: document.documentElement.scrollWidth, viewport: innerWidth }));
      expect(size.content).toBeLessThanOrEqual(size.viewport);
      await page.getByRole('link', { name: 'Back to forecast', exact: true }).click();
      await expect(page).toHaveURL(/\/weather\/.*location=51.5%2C-0.12/);
    });

    for (const state of ['missing', 'storm', 'stale'] as const) {
      test(`keeps ${state} forecasts out of outdoor suggestions`, async ({ page }) => {
        await stubPlannerForecast(page, state);
        await page.goto('/hourly?city=London&lat=51.5&lon=-0.12');
        const planner = page.getByRole('region', { name: 'Plan time outdoors' });
        await expect(planner.getByRole('status')).toContainText(state === 'stale' ? 'Recent hourly readings are unavailable' : 'No complete future');
        await expect(planner.getByRole('article')).toHaveCount(0);
        if (state === 'storm') await expect(planner.getByText(/Some periods were omitted/)).toBeVisible();
        await expect(page.getByRole('region', { name: 'Selected hour details' })).toBeVisible();
      });
    }
  });
}
