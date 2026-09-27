import { test, expect } from './fixtures';
import { stubHomeHubApis, stubWeatherApis } from '../fixtures/utils';
import type { Page } from '@playwright/test';

async function holdLocationRequest(page: Page): Promise<void> {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition: () => {
          const root = document.documentElement;
          root.dataset.locationRequests = String(Number(root.dataset.locationRequests || 0) + 1);
        },
      },
    });
  });
}

test.describe('first-visit home', () => {
  test.beforeEach(async ({ page }) => {
    await stubWeatherApis(page);
    await stubHomeHubApis(page);
    await page.route('**/api/weather/alerts**', (route) => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ alerts: [] }),
    }));
    await page.route('https://ipapi.co/json/', (route) => route.fulfill({ status: 503 }));
    await page.route('https://ipinfo.io/json', (route) => route.fulfill({ status: 503 }));
  });

  test('requests location once while keeping city search usable and hiding city lists', async ({ page }) => {
    let ipLookups = 0;
    page.on('request', (request) => {
      if (/https:\/\/(ipapi\.co|ipinfo\.io)\//.test(request.url())) ipLookups += 1;
    });
    await holdLocationRequest(page);
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-location-requests', '1');
    await expect(page.getByRole('button', { name: 'Waiting for location access' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Get started' })).toHaveCount(0);
    await expect(page.getByRole('contentinfo')).toHaveCount(0);
    await expect(page.getByTestId('home-discovery').filter({ visible: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Shuffle cities' })).toHaveCount(0);
    expect(ipLookups).toBe(0);

    const input = page.getByRole('main').getByPlaceholder('Search for a location…');
    await expect(input).toBeEnabled();
    await input.fill('New York, NY');
    await page.getByRole('main').getByRole('button', { name: 'Search for weather' }).click();
    await expect(page).toHaveURL(/\/weather\/new-york-ny/);
  });

  test('denied location leaves one error, location retry and city search available', async ({ page, context }) => {
    await context.grantPermissions([]);
    await page.goto('/');
    const error = page.getByRole('main').getByRole('alert');
    await expect(error).toBeVisible();
    await expect(error).toHaveCount(1);
    await expect(page.getByRole('button', { name: 'Use my location', exact: true })).toBeEnabled();
    await expect(page.getByRole('main').getByTestId('location-search-input')).toBeEnabled();
    await expect(page.getByRole('contentinfo')).toHaveCount(0);
    await expect(page.getByTestId('home-discovery').filter({ visible: true })).toHaveCount(0);
  });

  test('initial HTML has concise search guidance without a large intro', async ({ request }) => {
    const response = await request.get('/');
    await expect(response).toBeOK();
    const html = await response.text();
    expect(html.includes('Search for a location')).toBe(true);
    expect(html.includes('Get started')).toBe(false);
    expect(html.includes('<footer')).toBe(false);
  });

  test('city search remains usable while retrying a denied location request', async ({ page }) => {
    await page.addInitScript(() => {
      let calls = 0;
      Object.defineProperty(navigator, 'geolocation', {
        configurable: true,
        value: {
          getCurrentPosition: (_success: PositionCallback, error?: PositionErrorCallback) => {
            calls += 1;
            document.documentElement.dataset.locationRequests = String(calls);
            if (calls === 1) error?.({ code: 1, message: 'Denied', PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 });
          },
        },
      });
    });
    await page.goto('/');
    await expect(page.getByRole('main').getByRole('alert')).toBeVisible();
    await page.getByRole('button', { name: 'Use my location', exact: true }).click();
    await expect(page.locator('html')).toHaveAttribute('data-location-requests', '2');
    await expect(page.getByRole('button', { name: 'Waiting for location access' })).toBeVisible();
    await expect(page.getByRole('main').getByPlaceholder('Search for a location…')).toBeEnabled();
  });

  test('granted location loads weather and restores the normal footer', async ({ page, context }) => {
    await context.setGeolocation({ latitude: 40.7128, longitude: -74.006 });
    await context.grantPermissions(['geolocation']);
    await page.goto('/');
    await expect(page.getByTestId('temperature-value')).toBeVisible();
    await expect(page.getByRole('contentinfo')).toBeVisible();
    await expect(page.getByTestId('home-discovery').filter({ visible: true })).toHaveCount(1);
  });

  test('returning visitors load their saved city without requesting location again', async ({ page }) => {
    await holdLocationRequest(page);
    await page.addInitScript(() => {
      window.localStorage.setItem('bitweather_city', 'New York, US');
    });
    await page.goto('/');
    await expect(page.getByTestId('temperature-value')).toBeVisible();
    await expect(page.locator('html')).not.toHaveAttribute('data-location-requests');
    await expect(page.getByRole('contentinfo')).toBeVisible();
  });

  test('the narrow first-visit screen stays compact with no footer', async ({ page }) => {
    await holdLocationRequest(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await expect(page.getByRole('main').getByPlaceholder('Search for a location…')).toBeInViewport();
    await expect(page.getByRole('button', { name: 'Waiting for location access' })).toBeVisible();
    await expect(page.getByRole('contentinfo')).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });

  test('other pages retain their footer for new visitors', async ({ page }) => {
    await page.goto('/about');
    await expect(page.getByRole('contentinfo')).toBeVisible();
  });
});
