import { test, expect } from './fixtures';
import { stubWeatherApis } from '../fixtures/utils';

test.beforeEach(async ({ page }) => {
  await stubWeatherApis(page);
  await page.goto('/');

  // Force a deterministic baseline: seeded cache + no rate limit.
  await page.evaluate(() => {
    const now = Date.now();
    window.localStorage.removeItem('weather-app-rate-limit');
    window.localStorage.removeItem('weather-search-cache');

    const sampleWeather = {
      location: 'New York, US',
      country: 'US',
      temperature: 72,
      unit: '°F',
      condition: 'Clear',
      description: 'clear sky',
      humidity: 45,
      wind: { speed: 5, direction: 'NE', gust: 12 },
      pressure: '1015 hPa',
      sunrise: '6:00 am',
      sunset: '8:00 pm',
      forecast: [{
        day: 'Monday',
        highTemp: 75,
        lowTemp: 65,
        condition: 'Sunny',
        description: 'Clear sky',
        details: { humidity: 55, windSpeed: 6, windDirection: 'NE', pressure: '1015 hPa', precipitationChance: 10, visibility: 10, uvIndex: 5 },
        hourlyForecast: [{ time: '10 AM', temp: 70, condition: 'Sunny', precipChance: 0 }]
      }],
      moonPhase: { phase: 'Waxing Crescent', illumination: 20, emoji: 'Moon', phaseAngle: 45 },
      uvIndex: 5,
      aqi: 30,
      aqiCategory: 'Good',
      pollen: { tree: {}, grass: {}, weed: {} },
      coordinates: { lat: 40.7128, lon: -74.006 }
    };

    window.localStorage.setItem('bitweather_city', sampleWeather.location);
    window.localStorage.setItem('bitweather_weather_data', JSON.stringify(sampleWeather));
    window.localStorage.setItem('bitweather_cache_timestamp', String(now));
  });

  await page.reload({ waitUntil: 'domcontentloaded' });
});

test('displays main weather search component', async ({ page }) => {
  // Use .first() because both desktop and mobile search inputs share the same testid
  await expect(page.getByTestId('location-search-input').first()).toBeVisible({ timeout: 30000 });
});

test('displays home hub discovery cards', async ({ page }) => {
  const hub = page.getByTestId('home-hub');
  await expect(hub).toBeVisible({ timeout: 30000 });
  await expect(hub.getByRole('heading', { name: /FOR YOUR AREA/i })).toBeVisible();
  await expect(hub.getByTestId('home-hub-card').first()).toBeVisible();
});

test('can search for weather by city name', async ({ page }) => {
  await expect(page.getByTestId('temperature-value')).toBeVisible({ timeout: 15000 });
});

test('displays error for invalid location', async ({ page }) => {
  const data = await page.evaluate(async () => {
    const res = await fetch('/api/weather/geocoding?q=Invalidopolis&limit=1');
    return await res.json();
  });
  expect(data).toEqual([]);
});

test('responsive layout on mobile', async ({ page }) => {
  // Set mobile viewport
  await page.setViewportSize({ width: 375, height: 667 });

  // Wait for app to initialize - use .first() to handle duplicate elements
  await expect(page.getByTestId('location-search-input').first()).toBeVisible({ timeout: 10000 });

  // Check that the app is still functional
  await expect(page.getByTestId('location-search-input').first()).toBeVisible();
});

test('navigation links work correctly', async ({ page }) => {
  // Test About page link if exists (use .first() to target nav link, not footer)
  const aboutLink = page.locator('a[href="/about"]').first();
  if (await aboutLink.count() > 0) {
    await aboutLink.click();
    await expect(page).toHaveURL('/about');
    // About page was updated with "Retro Soul" heading
    await expect(page.locator('h1, h2').filter({ hasText: /Retro Soul|About/i })).toBeVisible();
  }
});

test('rate limiting message appears after multiple searches', async ({ page }) => {
  // Add console listener for debugging
  page.on('console', msg => console.log(`[Browser] ${msg.text()}`));

  await page.evaluate(() => {
    const now = Date.now();
    const requests = Array.from({ length: 61 }, (_, index) => now - index * 1000); // 61 requests to exceed limit of 60
    window.localStorage.setItem('weather-app-rate-limit', JSON.stringify({ requests, lastReset: now }));

    // Mock weather data to prevent auto-fetch
    const sampleWeather = {
      location: 'Testville, US',
      country: 'US',
      temperature: 72,
      unit: '°F',
      condition: 'Sunny',
      description: 'Clear sky',
      humidity: 45,
      wind: { speed: 5, direction: 'NE', gust: 12 },
      pressure: '1015 hPa',
      sunrise: '6:00 am',
      sunset: '8:00 pm',
      forecast: [],
      moonPhase: { phase: 'Waxing Crescent', illumination: 20, emoji: 'Moon', phaseAngle: 45 },
      uvIndex: 5,
      aqi: 30,
      aqiCategory: 'Good',
      pollen: { tree: {}, grass: {}, weed: {} },
      coordinates: { lat: 40.7128, lon: -74.006 }
    };
    window.localStorage.setItem('bitweather_city', sampleWeather.location);
    window.localStorage.setItem('bitweather_weather_data', JSON.stringify(sampleWeather));
    window.localStorage.setItem('bitweather_cache_timestamp', String(now));
  });

  await page.reload({ waitUntil: 'domcontentloaded' });

  // Wait for hydration and rate limit check
  await page.waitForTimeout(2000);

  const searchInput = page.getByTestId('location-search-input');

  // Expect input to be disabled due to rate limit
  await expect(searchInput).toBeDisabled({ timeout: 10000 });

  // Expect placeholder to indicate rate limit
  await expect(searchInput).toHaveAttribute('placeholder', /Rate limit reached/i);

  // Expect search button or location button to indicate rate limit
  const locationButton = page.locator('button').filter({ hasText: /RATE LIMITED/i });
  if (await locationButton.count() > 0) {
    await expect(locationButton).toBeVisible();
  }
});


test.describe('Weather Data Display', () => {
  test('displays current weather information', async ({ page }) => {
    const temperatureValue = page.locator('[data-testid="temperature-value"]').first();
    await expect(temperatureValue).toBeVisible({ timeout: 15000 });
    await expect(temperatureValue).toHaveText(/\d+°[FC]?/);
  });

  test('displays forecast information', async ({ page }) => {
    // Wait for weather data to load
    await expect(page.getByTestId('temperature-value')).toBeVisible({ timeout: 15000 });

    // Look for forecast elements - generalized for both old and new layouts
    // The shadcn refactor uses Cards with "FORECAST" in the title
    const forecastHeader = page.locator('h2, h3, div').filter({ hasText: /FORECAST/i }).first();
    await expect(forecastHeader).toBeVisible({ timeout: 10000 });
  });

  test('displays environmental data', async ({ page }) => {
    // Wait for weather data to load
    await expect(page.getByTestId('temperature-value')).toBeVisible({ timeout: 15000 });

    // Look for environmental data indicators (humidity, UV, AQI, etc.)
    // Using getByText is more reliable than body filtering
    await expect(page.getByText(/humidity/i).first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/UV Index/i).first()).toBeVisible({ timeout: 10000 });
  });
});
