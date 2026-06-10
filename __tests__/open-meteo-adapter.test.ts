/**
 * Unit tests for Open-Meteo adapter
 */

jest.mock('@/lib/weather/weather-forecast', () => ({
  fetchPollenData: jest.fn().mockResolvedValue({
    tree: { 'Tree': 'No Data' },
    grass: { 'Grass': 'No Data' },
    weed: { 'Weed': 'No Data' },
  }),
}));

import { buildWeatherDataFromOpenMeteo } from '@/lib/weather/open-meteo-adapter';
import type { OpenMeteoForecastResponse } from '@/lib/open-meteo-types';

const originalFetch = global.fetch;
const mockFetch = jest.fn();
global.fetch = mockFetch;

afterAll(() => {
  global.fetch = originalFetch;
});

function makeForecastResponse(): OpenMeteoForecastResponse {
  return {
    latitude: 40.71,
    longitude: -74.01,
    generationtime_ms: 0.5,
    utc_offset_seconds: -18000,
    timezone: 'America/New_York',
    timezone_abbreviation: 'EST',
    elevation: 10,
    current: {
      time: '2025-03-25T14:00',
      interval: 900,
      temperature_2m: 55.4,
      relative_humidity_2m: 62,
      apparent_temperature: 52.1,
      is_day: 1,
      precipitation: 0,
      weather_code: 2,
      cloud_cover: 50,
      surface_pressure: 1018.5,
      wind_speed_10m: 12.3,
      wind_direction_10m: 225,
      wind_gusts_10m: 18.7,
      uv_index: 4.2,
    },
    daily: {
      time: ['2025-03-25', '2025-03-26', '2025-03-27', '2025-03-28', '2025-03-29', '2025-03-30', '2025-03-31'],
      weather_code: [2, 3, 61, 0, 1, 2, 80],
      temperature_2m_max: [60, 58, 52, 65, 63, 61, 59],
      temperature_2m_min: [42, 40, 38, 44, 43, 41, 39],
      apparent_temperature_max: [57, 55, 48, 62, 60, 58, 56],
      apparent_temperature_min: [38, 36, 34, 40, 39, 37, 35],
      sunrise: ['2025-03-25T06:52', '2025-03-26T06:50', '2025-03-27T06:49', '2025-03-28T06:47', '2025-03-29T06:46', '2025-03-30T06:44', '2025-03-31T06:43'],
      sunset: ['2025-03-25T19:15', '2025-03-26T19:16', '2025-03-27T19:17', '2025-03-28T19:18', '2025-03-29T19:19', '2025-03-30T19:20', '2025-03-31T19:21'],
      daylight_duration: [44580, 44640, 44700, 44760, 44820, 44880, 44940],
      uv_index_max: [5, 4, 2, 6, 5, 4, 3],
      precipitation_sum: [0, 0, 0.5, 0, 0, 0.2, 0],
      precipitation_probability_max: [10, 20, 80, 5, 10, 30, 15],
      wind_speed_10m_max: [15, 18, 22, 10, 12, 14, 16],
      wind_gusts_10m_max: [25, 30, 35, 18, 20, 22, 24],
    },
    hourly: {
      time: Array.from({ length: 168 }, (_, i) => {
        const d = new Date('2025-03-25T00:00:00');
        d.setHours(d.getHours() + i);
        return d.toISOString().slice(0, 16);
      }),
      temperature_2m: Array.from({ length: 168 }, (_, i) => 50 + Math.round(10 * Math.sin(i / 24 * Math.PI))),
      apparent_temperature: Array.from({ length: 168 }, (_, i) => 48 + Math.round(10 * Math.sin(i / 24 * Math.PI))),
      relative_humidity_2m: Array.from({ length: 168 }, () => 65),
      weather_code: Array.from({ length: 168 }, () => 2),
      wind_speed_10m: Array.from({ length: 168 }, () => 8),
      wind_direction_10m: Array.from({ length: 168 }, () => 225),
      uv_index: Array.from({ length: 168 }, () => 3),
      visibility: Array.from({ length: 168 }, () => 10000),
      precipitation: Array.from({ length: 168 }, () => 0),
      precipitation_probability: Array.from({ length: 168 }, () => 10),
    },
  };
}

const mockAirQualityData = {
  latitude: 40.71, longitude: -74.01, generationtime_ms: 0.3,
  utc_offset_seconds: -18000, timezone: 'America/New_York', timezone_abbreviation: 'EST',
  current: {
    time: '2025-03-25T14:00', interval: 3600, us_aqi: 42,
    pm10: 15, pm2_5: 8, carbon_monoxide: 200, nitrogen_dioxide: 12,
    sulphur_dioxide: 5, ozone: 60, dust: 3, uv_index: 4.2,
  },
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Date, 'now').mockReturnValue(new Date('2025-03-25T14:00:00Z').getTime());
  mockFetch.mockImplementation((url: string) => {
    if (url.includes('/api/open-meteo/forecast')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(makeForecastResponse()) });
    }
    if (url.includes('/api/open-meteo/air-quality')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(mockAirQualityData) });
    }
    return Promise.resolve({ ok: false, status: 404 });
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('buildWeatherDataFromOpenMeteo', () => {
  it('should return WeatherData with correct current conditions', async () => {
    const result = await buildWeatherDataFromOpenMeteo(
      40.71, -74.01, 'New York', 'imperial', 'US'
    );

    expect(result.location).toBe('New York');
    expect(result.country).toBe('US');
    expect(result.temperature).toBe(55);
    expect(result.unit).toBe('°F');
    expect(result.condition).toBe('Clouds');
    expect(result.description).toBe('partly cloudy');
    expect(result.humidity).toBe(62);
  });

  it('should format wind data correctly', async () => {
    const result = await buildWeatherDataFromOpenMeteo(
      40.71, -74.01, 'New York', 'imperial', 'US'
    );

    expect(result.wind.speed).toBe(12.3);
    expect(result.wind.direction).toBe('SW'); // 225 degrees
    expect(result.wind.gust).toBe(18.7);
  });

  it('should format sunrise and sunset from ISO strings', async () => {
    const result = await buildWeatherDataFromOpenMeteo(
      40.71, -74.01, 'New York', 'imperial', 'US'
    );

    expect(result.sunrise).toBe('6:52 am');
    expect(result.sunset).toBe('7:15 pm');
  });

  it('should produce exactly 7 forecast days with correct temps', async () => {
    const result = await buildWeatherDataFromOpenMeteo(
      40.71, -74.01, 'New York', 'imperial', 'US'
    );

    expect(result.forecast).toHaveLength(7);
    expect(result.forecast[0].highTemp).toBe(60);
    expect(result.forecast[0].lowTemp).toBe(42);
  });

  it('should include AQI from air quality API', async () => {
    const result = await buildWeatherDataFromOpenMeteo(
      40.71, -74.01, 'New York', 'imperial', 'US'
    );

    expect(result.aqi).toBe(42);
    expect(result.aqiCategory).toBe('Good');
  });

  it('should build 48 hourly entries with temperature and conditions', async () => {
    const result = await buildWeatherDataFromOpenMeteo(
      40.71, -74.01, 'New York', 'imperial', 'US'
    );

    expect(result.hourlyForecast).toBeDefined();
    expect(result.hourlyForecast!.length).toBe(48);
    expect(result.hourlyForecast![0].temp).toBeDefined();
    expect(result.hourlyForecast![0].condition).toBe('Clouds');
    expect(result.hourlyForecast![0].precipChance).toBe(10);
    expect(result.hourlyForecast![0].windDirection).toBe('SW');
  });

  // Regression: hourly.time[] entries are tz-naive wall-clock strings in the
  // CITY's timezone. The window start must be selected using
  // utc_offset_seconds, not the runtime's timezone — previously a city far
  // from the viewer's timezone got a 48h strip starting hours in the past
  // (or future), regardless of the runner's TZ.
  it('should start the hourly window at the city-local current hour for remote timezones', async () => {
    // Tokyo: UTC+9. Freeze "now" at 05:00 UTC == 14:00 Tokyo wall clock.
    jest.spyOn(Date, 'now').mockReturnValue(new Date('2025-03-25T05:00:00Z').getTime());

    const tokyoResponse = makeForecastResponse();
    tokyoResponse.utc_offset_seconds = 32400;
    tokyoResponse.timezone = 'Asia/Tokyo';
    tokyoResponse.timezone_abbreviation = 'JST';
    // Explicit naive wall-clock strings from Tokyo midnight, 72 hours.
    tokyoResponse.hourly.time = Array.from({ length: 72 }, (_, i) => {
      const day = 25 + Math.floor(i / 24);
      const hour = i % 24;
      return `2025-03-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:00`;
    });

    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/api/open-meteo/forecast')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(tokyoResponse) });
      }
      if (url.includes('/api/open-meteo/air-quality')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockAirQualityData) });
      }
      return Promise.resolve({ ok: false, status: 404 });
    });

    const result = await buildWeatherDataFromOpenMeteo(
      35.68, 139.69, 'Tokyo', 'metric', 'JP'
    );

    // 05:00 UTC is 14:00 in Tokyo — the strip must start at the 2 PM slot.
    expect(result.hourlyForecast![0].time).toBe('2 PM');
    expect(result.hourlyForecast!.length).toBe(48);
  });

  // Regression: hourly visibility was fetched but never mapped, so the
  // Visibility card always showed "N/A" with a default "Clear" badge.
  it('should map current-hour visibility (meters) into day-0 details (miles)', async () => {
    const result = await buildWeatherDataFromOpenMeteo(
      40.71, -74.01, 'New York', 'imperial', 'US'
    );

    // Fixture visibility is 10000 m for every hour -> 6.2 mi.
    expect(result.forecast[0].details.visibility).toBe(6.2);
  });
});
