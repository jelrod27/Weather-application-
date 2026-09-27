import { test, expect } from './fixtures';
import { stubWeatherApis } from '../fixtures/utils';

test.describe('first-visit home', () => {
  test.beforeEach(async ({ page }) => {
    await stubWeatherApis(page);
    await page.route('https://ipapi.co/json/', (route) => route.fulfill({ status: 503 }));
    await page.route('https://ipinfo.io/json', (route) => route.fulfill({ status: 503 }));
  });

  test('a fresh visitor can choose a city without waiting for location detection', async ({ page }) => {
    let ipLookups = 0;
    page.on('request', (request) => {
      if (/https:\/\/(ipapi\.co|ipinfo\.io)\//.test(request.url())) ipLookups += 1;
    });
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'permissions', {
        configurable: true,
        value: { query: async () => ({ state: 'prompt' }) },
      });
    });

    await page.goto('/');

    const start = page.getByRole('heading', { name: /get started/i });
    await expect(start).toBeVisible();
    await expect(page.getByRole('button', { name: 'Use my location' })).toBeEnabled();
    await expect(page.getByRole('button', { name: 'Shuffle cities' })).toBeVisible();
    expect(ipLookups).toBe(0);
    await page.getByRole('button', { name: 'Search for a city' }).click();

    const input = page.getByRole('main').getByTestId('location-search-input');
    await expect(input).toBeFocused();
    await expect(input).toBeEnabled();
    await input.fill('New York, NY');
    await page.getByRole('main').getByRole('button', { name: 'Search for weather' }).click();
    await expect(page).toHaveURL(/\/weather\/new-york-ny/);
  });

  test('denied device location keeps both the start guidance and city search available', async ({ page, context }) => {
    await context.grantPermissions([]);
    await page.goto('/');

    await expect(page.getByRole('heading', { name: /get started/i })).toBeVisible();
    await page.getByRole('button', { name: 'Use my location' }).click();

    await expect(page.getByTestId('global-error')).toBeVisible();
    await expect(page.getByRole('heading', { name: /get started/i })).toBeVisible();
    await expect(page.getByRole('main').getByTestId('location-search-input')).toBeEnabled();
    await page.getByRole('button', { name: 'Search for a city' }).click();
    await expect(page.getByRole('main').getByTestId('location-search-input')).toBeFocused();
  });

  test('initial HTML explains how to begin before client controls load', async ({ request }) => {
    const response = await request.get('/');
    await expect(response).toBeOK();
    expect((await response.text()).includes('Get started')).toBe(true);
  });

  test('returning visitors load their saved city without a persistent start panel', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('bitweather_city', 'New York, US');
    });
    await page.goto('/');
    await expect(page.getByTestId('temperature-value')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Get started' })).toHaveCount(0);
  });

  test('first-visit choices remain visible on a narrow screen', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Get started' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Use my location' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Search for a city' })).toBeVisible();
    await expect(page.getByRole('main').getByTestId('location-search-input')).toBeVisible();
  });
});
