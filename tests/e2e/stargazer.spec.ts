import { test, expect } from './fixtures';
import { stargazerE2eFixture } from '../fixtures/stargazer-e2e-fixture';

import type { Page } from '@playwright/test';

/** Basic shell coverage, with provider coordinates matching each requested city. */
async function stubStargazerRoutes(page: Page): Promise<void> {
  await page.route('**/api/stargazer**', route => {
    const params = new URL(route.request().url()).searchParams;
    return route.fulfill({ json: { ...stargazerE2eFixture(), location: {
      lat: Number(params.get('lat')), lon: Number(params.get('lon')),
    } } });
  });
  await page.route('**/api/weather/geocoding**', route => route.fulfill({ json: [] }));
}

test.beforeEach(async ({ page }) => {
  await stubStargazerRoutes(page);
  await page.goto('/stargazer', { waitUntil: 'domcontentloaded' });
});

test('renders the Stargazer Command Center shell', async ({ page }) => {
  await expect(page).toHaveTitle(/Stargazer/i);
  await expect(page.getByTestId('stargazer-page-title')).toBeVisible({ timeout: 30000 });
});

test('exposes the location search form', async ({ page }) => {
  const search = page.getByTestId('stargazer-location-search').first();
  await expect(search).toBeVisible({ timeout: 30000 });
  await expect(page.getByTestId('stargazer-location-go').first()).toBeVisible({ timeout: 30000 });
});

test('prefills location from hub query params', async ({ page }) => {
  await page.goto('/stargazer?lat=33.5779&lon=-101.8552&q=Lubbock%2C%20TX', {
    waitUntil: 'domcontentloaded',
  });
  await expect(page.getByTestId('stargazer-location-search').first()).toHaveValue('Lubbock, TX', {
    timeout: 30000,
  });
});
