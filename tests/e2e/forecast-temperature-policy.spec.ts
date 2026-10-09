import { test, expect } from './fixtures';
import { stubWeatherApis, stubHomeHubApis, stubRadarApis, dismissWarningTakeoverIfPresent } from '../fixtures/utils';

test.use({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });

// Service tests exercise source selection; these lock down country/unit plumbing
// and display of the resulting temperature contract on both entry points.
for (const units of ['imperial', 'metric'] as const) {
  for (const entry of ['home', 'city'] as const) {
    test(`${entry} preserves the selected forecast temperatures in ${units}`, async ({ page, context }) => {
      await page.clock.setFixedTime(new Date('2026-10-04T23:00:00Z'));
      await context.setGeolocation({ latitude: 37.6624, longitude: -121.8747 });
      await context.grantPermissions(['geolocation']);
      await page.addInitScript(unitSystem => {
        localStorage.setItem('bitweather_user_preferences', JSON.stringify({
          settings: { units: unitSystem, theme: 'clear-sky', auto_location: true, cacheEnabled: true },
          updatedAt: Date.now(),
        }));
      }, units);
      await stubWeatherApis(page, { cityName: 'Pleasanton', country: 'US', lat: 37.6624, lon: -121.8747 });
      await stubHomeHubApis(page);
      await stubRadarApis(page);
      const metric = units === 'metric';
      let forecastRequests = 0;
      await page.route('**/api/open-meteo/forecast**', route => {
        const query = new URL(route.request().url()).searchParams;
        expect(query.get('country_code')).toBe('US');
        expect(query.get('temperature_unit')).toBe(metric ? 'celsius' : 'fahrenheit');
        expect(Number(query.get('lat'))).toBeCloseTo(37.6624, 3);
        expect(Number(query.get('lon'))).toBeCloseTo(-121.8747, 3);
        forecastRequests += 1;
        const days = Array.from({ length: 7 }, (_, i) => `2026-10-${String(i + 4).padStart(2, '0')}`);
        const hours = Array.from({ length: 48 }, (_, i) =>
          new Date(Date.UTC(2026, 9, 4, 16 + i)).toISOString().slice(0, 16));
        return route.fulfill({ json: {
          latitude: 37.6624, longitude: -121.8747, timezone: 'America/Los_Angeles', utc_offset_seconds: -25200,
          current: { time: hours[0], temperature_2m: metric ? 36 : 97, weather_code: 0, is_day: 1, surface_pressure: 1013, uv_index: 3 },
          daily: {
            time: days, temperature_2m_max: metric ? [37, 37, 38, 37, 35, 31.4, 26.6] : [98, 99, 100, 98, 94, 88.5, 79.9],
            temperature_2m_min: days.map(() => metric ? 16 : 61), weather_code: days.map(() => 0),
            sunrise: days.map(date => `${date}T07:00`), sunset: days.map(date => `${date}T18:45`),
          },
          hourly: {
            time: hours, temperature_2m: hours.map(() => metric ? 30 : 86),
            weather_code: hours.map(() => 0), precipitation_probability: hours.map(() => 0),
            wind_speed_10m: hours.map(() => 5), is_day: hours.map(() => 1),
          },
        } });
      });
      await page.goto(entry === 'home' ? '/' : '/weather/pleasanton-ca?location=37.6624%2C-121.8747');
      await dismissWarningTakeoverIfPresent(page);
      await expect(page.getByRole('button', { name: new RegExp(`Forecast for Friday: High ${metric ? '31°C' : '89°F'}`) })).toBeVisible();
      await expect(page.getByRole('button', { name: new RegExp(`Forecast for Saturday: High ${metric ? '27°C' : '80°F'}`) })).toBeVisible();
      expect(forecastRequests).toBeGreaterThan(0);
      await page.getByRole('region', { name: 'Next few hours' }).getByRole('link', { name: 'Hourly details', exact: true }).click();
      await expect(page).toHaveURL(/\/hourly\?/);
      await expect(page.getByText(metric ? '30°C' : '86°F', { exact: true }).first()).toBeVisible();
    });
  }
}
