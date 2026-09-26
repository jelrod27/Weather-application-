import { test, expect } from './fixtures';
import { stubHomeHubApis, stubWeatherApis } from '../fixtures/utils';

test('Hourly direct search recovers a city and returns to the same coordinates', async ({ page }) => {
  await stubWeatherApis(page, { cityName: 'London', country: 'GB', lat: 51.5, lon: -0.12 });
  await stubHomeHubApis(page);
  await page.goto('/hourly', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('Choose a location to see its hourly forecast.')).toBeVisible();
  const search = page.getByRole('textbox').first();
  await search.fill('London, UK');
  await page.getByRole('button', { name: 'Search for weather', exact: true }).click();
  await expect(page).toHaveURL(/\/hourly\?city=London/);
  const back = page.getByRole('link', { name: 'Back to forecast' });
  await expect(back).toHaveAttribute('href', /location=51.5%2C-0.12/);
  await back.click();
  await expect(page).toHaveURL(/\/weather\/london-uk\?location=51.5%2C-0.12/);
  await expect(page.getByText('Location not found', { exact: false })).toBeHidden();
  await expect(page.getByRole('heading', { name: /London/ }).first()).toBeVisible();
});

