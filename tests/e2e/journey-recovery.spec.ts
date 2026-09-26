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

test('Tropical imagery has an official-source escape and image retry', async ({ page }) => {
  await page.route('**/cdn.star.nesdis.noaa.gov/**', (route) => route.abort());
  await page.goto('/tropical', { waitUntil: 'domcontentloaded' });
  const card = page.locator('section').filter({ has: page.getByRole('heading', { name: 'ATLANTIC SATELLITE', exact: true }) });
  await expect(card.getByRole('button', { name: 'Retry image' })).toBeVisible();
  await expect(card.getByRole('link', { name: /official NOAA/ })).toHaveAttribute('href', 'https://www.nhc.noaa.gov/satellite.php');
  await expect(card.getByText(/Observation or forecast valid time/)).toBeVisible();
  await card.getByRole('button', { name: 'Retry image' }).click();
  await expect(card.getByRole('button', { name: 'Retry image' })).toBeVisible();
});

test('Hourly return preserves coordinates across a canonical city redirect', async ({ page }) => {
  await stubWeatherApis(page, { cityName: 'Denver', lat: 39.8, lon: -104.6 });
  await stubHomeHubApis(page);
  await page.goto('/hourly?city=Denver', { waitUntil: 'domcontentloaded' });
  const back = page.getByRole('link', { name: 'Back to forecast' });
  await expect(back).toHaveAttribute('href', '/weather/denver?location=39.8%2C-104.6');
  await back.click();
  await expect(page).toHaveURL(/\/weather\/denver-co\?location=39.8%2C-104.6/);
});
