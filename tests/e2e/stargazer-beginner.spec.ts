import { test, expect } from './fixtures';
import { beginnerStargazerFixture } from '../fixtures/beginner-stargazer-fixture';
import type { StargazerData } from '../../lib/stargazer/types';
import type { Page } from '@playwright/test';

const now = Date.parse('2026-09-27T00:00:00Z');
const url = '/stargazer?lat=40.7128&lon=-74.006&q=New+York';
async function load(page: Page, data = beginnerStargazerFixture(), href = url): Promise<void> {
  await page.route('**/api/stargazer?**', route => route.fulfill({ json: data }));
  await page.goto(href);
  await expect(page.getByText(`Observing place: ${data.location.displayName}`)).toBeVisible();
}
test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(now);
  await load(page);
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
for (const [theme, width] of [['daybreak', 390], ['daybreak', 1280], ['nord', 390]] as const) {
  test(`keeps the beginner controls readable at ${width}px in ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(value => localStorage.setItem('weather-edu-theme', value), theme);
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    await expect(page.getByRole('heading', { name: 'Try this hour' })).toBeVisible();
    await page.getByRole('radio', { name: 'Binoculars', exact: true }).check();
    await expect(page.getByRole('radio', { name: 'Binoculars', exact: true })).toBeChecked();
    await expect(page).toHaveURL(/equipment=binoculars/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: `/tmp/weather-pr6-${theme}-${width}.png`, fullPage: true });
  });
}

test('keeps city, hour and equipment through a finding guide and back', async ({ page }) => {
  await page.getByRole('radio', { name: 'Binoculars', exact: true }).check();
  await page.getByLabel('Observing hour', { exact: true }).selectOption(String(now + 7200000));
  await page.getByRole('link', { name: 'Finding guide for Andromeda Galaxy' }).click();
  await expect(page.getByRole('heading', { name: /How to find/ })).toBeVisible();
  await expect(page.getByText(/midpoint of the selected/)).toBeVisible();
  await expect(page).toHaveURL(/at=2026-09-27T02/);
  await page.getByRole('link', { name: /Back to Stargazer/ }).click();
  await expect(page.getByRole('radio', { name: 'Binoculars', exact: true })).toBeChecked();
  await expect(page.getByLabel('Observing hour', { exact: true })).toHaveValue(String(now + 7200000));
  await expect(page.getByText('Observing place: New York')).toBeVisible();
});
test('supports keyboard tab navigation and catalog discovery with preserved context', async ({ page }) => {
  const start = page.getByRole('tab', { name: /Start here/ });
  await start.focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: /Conditions/ })).toBeFocused();
  await page.keyboard.press('End');
  await expect(page.getByRole('tab', { name: /Launches/ })).toBeFocused();
  await page.keyboard.press('Home');
  await page.getByRole('link', { name: 'Browse the full catalog' }).click();
  await expect(page.getByRole('status').filter({ hasText: '151 of 151 objects' })).toBeVisible();
  await page.getByRole('searchbox').fill('seven sisters');
  await expect(page.getByRole('status').filter({ hasText: '1 of 151 objects' })).toBeVisible();
  await page.getByRole('link', { name: /M45/ }).focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/q=New\+York/);
  await expect(page.getByRole('heading', { name: /How to find/ })).toBeVisible();
});
test('keeps beginner planning useful when seeing and transparency are unavailable', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Try this hour' })).toBeVisible();
  await page.getByRole('tab', { name: /Conditions/ }).click();
  await expect(page.getByText('Seeing and transparency data unavailable.')).toBeVisible();
  await expect(page.getByText('--', { exact: true }).first()).toBeVisible();
});
for (const issue of ['clouds', 'weather-code', 'missing'] as const) {
  test(`does not recommend a ${issue} hour`, async ({ page }) => {
    const data = beginnerStargazerFixture();
    for (const hour of data.beginnerNight!.hours) { hour.weather.issues = [issue]; if (issue === 'missing') hour.weather.cloudLow = hour.weather.cloudHigh = null; }
    await load(page, data);
    await expect(page.getByRole('heading', { name: 'Inspect this hour' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Try this hour' })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Learn to look' })).toBeVisible();
  });
}
test('withholds stale suggestions and explains malformed shared-hour recovery', async ({ page }) => {
  const data = beginnerStargazerFixture();
  data.weatherRetrievedAt = new Date(now - 31 * 60000).toISOString();
  await load(page, data, `${url}&at=bad`);
  await expect(page.getByRole('heading', { name: 'Refresh to plan this night' })).toBeVisible();
  await expect(page.getByText(/shared hour.*replaced/)).toBeVisible();
});
test('recovers from a failed provider with retry and static lessons', async ({ page }) => {
  await page.route('**/api/stargazer?**', route => route.fulfill({ status: 503, json: { error: 'Unavailable' } }));
  await page.reload();
  await expect(page.getByText(/Forecast unavailable/)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Learn to look' })).toBeVisible();
  await page.route('**/api/stargazer?**', route => route.fulfill({ json: beginnerStargazerFixture() }));
  await page.getByRole('button', { name: 'Refresh forecast' }).click();
  await expect(page.getByRole('heading', { name: 'Try this hour' })).toBeVisible();
});
test('disambiguates repeated local hours across a DST boundary', async ({ page }) => {
  const dstNow = Date.parse('2026-11-01T04:00:00Z');
  await page.clock.setFixedTime(dstNow);
  await load(page, beginnerStargazerFixture(dstNow));
  const hour = page.getByLabel('Observing hour', { exact: true });
  await expect(hour.locator('option').first()).toHaveText(/1:00 AM GMT-4.*1:00 AM GMT-5/);
  await expect(hour.locator('option').nth(1)).toHaveText(/1:00 AM GMT-5.*2:00 AM GMT-5/);
});
test('explains polar daylight without inventing dark-sky targets', async ({ page }) => {
  const data: StargazerData = { ...beginnerStargazerFixture(), location: { lat: 69.65, lon: 18.96, displayName: 'Tromsø', timezone: 'Europe/Oslo' } };
  data.darkWindow = { ...data.darkWindow, status: 'none', sunset: null, sunrise: null };
  data.beginnerNight = { hours: [] };
  await load(page, data, '/stargazer?lat=69.65&lon=18.96&q=Tromso');
  await expect(page.getByText(/No astronomical darkness this night/)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'No complete future hour available' })).toBeVisible();
});
test('asks direct object-guide visitors to choose a city', async ({ page }) => {
  await page.goto('/stargazer/objects/M31');
  await expect(page.getByRole('link', { name: 'Choose an observing location' })).toBeVisible();
  await expect(page.locator('section').filter({ has: page.getByRole('heading', { name: /How to find/ }) }).getByText(/New York/)).toHaveCount(0);
});
