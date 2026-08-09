/**
 * Unit tests for Open-Meteo adapter
 *
 * jsdom = client path (same-origin /api proxies).
 * Server path is covered by temporarily removing `window`.
 */

const mockFetchOpenMeteoForecast = jest.fn();
const mockFetchOpenMeteoAirQuality = jest.fn();
const mockFetchPollenData = jest.fn().mockResolvedValue({
  tree: { Tree: 'No Data' },
  grass: { Grass: 'No Data' },
  weed: { Weed: 'No Data' },
});
const mockIsServerRuntime = jest.fn(() => false);

jest.mock('@/lib/open-meteo', () => ({
  fetchOpenMeteoForecast: (...args: unknown[]) => mockFetchOpenMeteoForecast(...args),
  fetchOpenMeteoAirQuality: (...args: unknown[]) => mockFetchOpenMeteoAirQuality(...args),
}));

jest.mock('@/lib/weather/weather-forecast', () => ({
  fetchPollenData: (...args: unknown[]) => mockFetchPollenData(...args),
}));

jest.mock('@/lib/runtime-env', () => ({
  isServerRuntime: () => mockIsServerRuntime(),
}));

import { buildWeatherDataFromOpenMeteo } from '@/lib/weather/open-meteo-adapter';
import type {
  OpenMeteoAirQualityResponse,
  OpenMeteoForecastResponse,
} from '@/lib/open-meteo-types';

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

const mockAirQualityData: OpenMeteoAirQualityResponse = {
  latitude: 40.71,
  longitude: -74.01,
  generationtime_ms: 0.3,
  utc_offset_seconds: -18000,
  timezone: 'America/New_York',
  timezone_abbreviation: 'EST',
  current: {
    time: '2025-03-25T14:00',
    interval: 3600,
    us_aqi: 42,
    pm10: 15,
    pm2_5: 8,
    carbon_monoxide: 200,
    nitrogen_dioxide: 12,
    sulphur_dioxide: 5,
    ozone: 60,
    dust: 3,
    uv_index: 4.2,
  },
  current_units: {},
};

function stubClientApiFetches(forecast: OpenMeteoForecastResponse = makeForecastResponse()) {
  mockFetch.mockImplementation((url: string) => {
    if (String(url).includes('/api/open-meteo/forecast')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(forecast) });
    }
    if (String(url).includes('/api/open-meteo/air-quality')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(mockAirQualityData) });
    }
    return Promise.resolve({ ok: false, status: 404 });
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  delete process.env.GOOGLE_POLLEN_API_KEY;
  mockIsServerRuntime.mockReturnValue(false);
  jest.spyOn(Date, 'now').mockReturnValue(new Date('2025-03-25T14:00:00Z').getTime());
  stubClientApiFetches();
  mockFetchOpenMeteoForecast.mockResolvedValue(makeForecastResponse());
  mockFetchOpenMeteoAirQuality.mockResolvedValue(mockAirQualityData);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('buildWeatherDataFromOpenMeteo (client / jsdom)', () => {
  it('should use same-origin Open-Meteo API proxies and pollen API', async () => {
    await buildWeatherDataFromOpenMeteo(40.71, -74.01, 'New York', 'imperial', 'US');

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/open-meteo/forecast?'),
      expect.any(Object),
    );
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/open-meteo/air-quality?'),
      expect.any(Object),
    );
    expect(mockFetchOpenMeteoForecast).not.toHaveBeenCalled();
    expect(mockFetchPollenData).toHaveBeenCalledWith(40.71, -74.01);
  });

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
    stubClientApiFetches(tokyoResponse);

    const result = await buildWeatherDataFromOpenMeteo(
      35.68, 139.69, 'Tokyo', 'metric', 'JP'
    );

    // 05:00 UTC is 14:00 in Tokyo — the strip must start at the 2 PM slot.
    expect(result.hourlyForecast![0].time).toBe('2 PM');
    expect(result.hourlyForecast!.length).toBe(48);
    // dt must be a true UTC epoch for 14:00 JST (= 05:00 UTC), not runtime-local parse.
    expect(result.hourlyForecast![0].dt).toBe(
      Math.floor(new Date('2025-03-25T05:00:00Z').getTime() / 1000),
    );
    expect(result.timezone).toBe('Asia/Tokyo');
    expect(result.timezoneAbbreviation).toBe('JST');
  });

  // Regression: a Lisbon viewer looking at Pleasanton must get California
  // epochs on hourly dt so the "NOW" chip lands on local noon, not Lisbon evening.
  it('should emit UTC epochs for Pleasanton hours when utc_offset is Pacific', async () => {
    // Lisbon-ish "now": 2025-08-09T19:27:00Z (== 12:27 PM PDT).
    jest.spyOn(Date, 'now').mockReturnValue(new Date('2025-08-09T19:27:00Z').getTime());

    const pleasanton = makeForecastResponse();
    pleasanton.utc_offset_seconds = -25200; // PDT
    pleasanton.timezone = 'America/Los_Angeles';
    pleasanton.timezone_abbreviation = 'PDT';
    pleasanton.hourly.time = Array.from({ length: 48 }, (_, i) => {
      const hour = i % 24;
      const day = 9 + Math.floor(i / 24);
      return `2025-08-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:00`;
    });
    stubClientApiFetches(pleasanton);

    const result = await buildWeatherDataFromOpenMeteo(
      37.66, -121.87, 'Pleasanton', 'imperial', 'US'
    );

    // First slot should be 12 PM PDT wall clock.
    expect(result.hourlyForecast![0].time).toBe('12 PM');
    // 12:00 PDT = 19:00 UTC.
    expect(result.hourlyForecast![0].dt).toBe(
      Math.floor(new Date('2025-08-09T19:00:00Z').getTime() / 1000),
    );
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

describe('buildWeatherDataFromOpenMeteo (server runtime)', () => {
  beforeEach(() => {
    mockIsServerRuntime.mockReturnValue(true);
  });

  it('should call lib/open-meteo directly and derive pollen from AQ when Google key is absent', async () => {
    const aqWithPollen: OpenMeteoAirQualityResponse = {
      ...mockAirQualityData,
      hourly: {
        time: ['2025-03-25T14:00'],
        birch_pollen: [35],
        grass_pollen: [10],
        ragweed_pollen: [5],
      },
    };
    mockFetchOpenMeteoAirQuality.mockResolvedValue(aqWithPollen);

    const result = await buildWeatherDataFromOpenMeteo(
      40.71, -74.01, 'New York', 'imperial', 'US'
    );

    expect(mockFetchOpenMeteoForecast).toHaveBeenCalledWith(40.71, -74.01, {
      forecastDays: 7,
      temperatureUnit: 'fahrenheit',
      windSpeedUnit: 'mph',
      precipitationUnit: 'inch',
    });
    expect(mockFetchOpenMeteoAirQuality).toHaveBeenCalledWith(40.71, -74.01);
    expect(mockFetch).not.toHaveBeenCalled();
    expect(mockFetchPollenData).not.toHaveBeenCalled();
    expect(result.pollen.tree.Birch).toBe('Moderate');
    expect(result.pollen.grass.Grass).toBe('Low');
    expect(result.aqi).toBe(42);
  });

  it('should use pollen API on server when GOOGLE_POLLEN_API_KEY is set', async () => {
    process.env.GOOGLE_POLLEN_API_KEY = 'test-key';
    mockFetchPollenData.mockResolvedValueOnce({
      tree: { Oak: 'High' },
      grass: { Grass: 'Low' },
      weed: { Ragweed: 'Moderate' },
    });

    const result = await buildWeatherDataFromOpenMeteo(
      40.71, -74.01, 'New York', 'imperial', 'US'
    );

    expect(mockFetchOpenMeteoForecast).toHaveBeenCalled();
    expect(mockFetchPollenData).toHaveBeenCalledWith(40.71, -74.01);
    expect(result.pollen).toEqual({
      tree: { Oak: 'High' },
      grass: { Grass: 'Low' },
      weed: { Ragweed: 'Moderate' },
    });
  });

  it('should pass metric unit options through to lib/open-meteo', async () => {
    await buildWeatherDataFromOpenMeteo(35.68, 139.69, 'Tokyo', 'metric', 'JP');

    expect(mockFetchOpenMeteoForecast).toHaveBeenCalledWith(35.68, 139.69, {
      forecastDays: 7,
      temperatureUnit: 'celsius',
      windSpeedUnit: 'kmh',
      precipitationUnit: 'mm',
    });
  });
});

describe('hourly window edge cases', () => {
  // Test 1: truncated hourly array yields a short strip
  it('should yield a short strip when the hourly array is truncated to 20 entries', async () => {
    // "now" frozen at 2025-03-25T14:00:00Z (set in beforeEach).
    // New York utc_offset_seconds: -18000 → city wall-clock "now" is 09:00.
    // Explicit naive strings T00:00..T19:00 (20 entries) are deterministic
    // regardless of runner timezone.
    // cityWallClockToEpoch('2025-03-25T09:00') = parse('2025-03-25T09:00Z') - (-18000000ms)
    //   = epoch of 09:00Z + 18000000ms = epoch of 14:00Z = nowMs → passes cutoff.
    // cityWallClockToEpoch('2025-03-25T08:00') = 13:00Z < 13:30Z → fails.
    // Therefore startIdx = 9, hourlyCount = min(20-9, 48) = 11.
    const response = makeForecastResponse();
    const count = 20;
    const explicitTimes = Array.from({ length: count }, (_, i) =>
      `2025-03-25T${String(i).padStart(2, '0')}:00`
    );
    response.hourly.time = explicitTimes;
    response.hourly.temperature_2m = response.hourly.temperature_2m.slice(0, count);
    response.hourly.apparent_temperature = response.hourly.apparent_temperature.slice(0, count);
    response.hourly.relative_humidity_2m = response.hourly.relative_humidity_2m.slice(0, count);
    response.hourly.weather_code = response.hourly.weather_code.slice(0, count);
    response.hourly.wind_speed_10m = response.hourly.wind_speed_10m.slice(0, count);
    response.hourly.wind_direction_10m = response.hourly.wind_direction_10m.slice(0, count);
    response.hourly.uv_index = response.hourly.uv_index.slice(0, count);
    response.hourly.visibility = response.hourly.visibility.slice(0, count);
    response.hourly.precipitation = response.hourly.precipitation.slice(0, count);
    response.hourly.precipitation_probability = response.hourly.precipitation_probability.slice(0, count);
    stubClientApiFetches(response);

    const result = await buildWeatherDataFromOpenMeteo(40.71, -74.01, 'New York', 'imperial', 'US');

    expect(result.hourlyForecast!.length).toBe(11);
    expect(result.hourlyForecast![0].time).toBe('9 AM');
  });

  // Test 2: missing utc_offset_seconds falls back to UTC interpretation
  it('should treat naive strings as UTC when utc_offset_seconds is missing', async () => {
    // "now" frozen at 2025-03-25T14:00:00Z.
    // utc_offset_seconds = undefined → utcOffsetMs = 0 → naive strings read as UTC.
    // Cutoff = 13:30Z → first entry >= 13:30Z is T14:00 at index 14.
    // hourlyCount = min(72-14, 48) = 48.
    const response = makeForecastResponse();
    const count = 72;
    (response as unknown as Record<string, unknown>).utc_offset_seconds = undefined;
    const explicitTimes = Array.from({ length: count }, (_, i) => {
      const day = 25 + Math.floor(i / 24);
      const hour = i % 24;
      return `2025-03-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:00`;
    });
    response.hourly.time = explicitTimes;
    response.hourly.temperature_2m = Array.from({ length: count }, () => 55);
    response.hourly.apparent_temperature = Array.from({ length: count }, () => 52);
    response.hourly.relative_humidity_2m = Array.from({ length: count }, () => 65);
    response.hourly.weather_code = Array.from({ length: count }, () => 2);
    response.hourly.wind_speed_10m = Array.from({ length: count }, () => 8);
    response.hourly.wind_direction_10m = Array.from({ length: count }, () => 225);
    response.hourly.uv_index = Array.from({ length: count }, () => 3);
    response.hourly.visibility = Array.from({ length: count }, () => 10000);
    response.hourly.precipitation = Array.from({ length: count }, () => 0);
    response.hourly.precipitation_probability = Array.from({ length: count }, () => 10);
    stubClientApiFetches(response);

    const result = await buildWeatherDataFromOpenMeteo(40.71, -74.01, 'New York', 'imperial', 'US');

    expect(result.hourlyForecast![0].time).toBe('2 PM');
    expect(result.hourlyForecast!.length).toBe(48);
  });

  // Test 3: all-past hourly data falls back to the array start (stale strip)
  it('should fall back to the array start when all hourly entries are in the past', async () => {
    // Characterizes the fallback: an entirely-stale response renders
    // from the array start rather than returning an empty strip.
    // "now" frozen at 2025-03-25T14:00:00Z. All 168 naive strings are from
    // the previous week (2025-03-18..2025-03-24). No entry passes the cutoff,
    // so the for-loop never breaks and startIdx stays 0.
    const response = makeForecastResponse();
    const count = 168;
    const staleTimes = Array.from({ length: count }, (_, i) => {
      const dayOffset = Math.floor(i / 24); // 0..6
      const day = 18 + dayOffset;           // 18..24
      const hour = i % 24;
      return `2025-03-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:00`;
    });
    response.hourly.time = staleTimes;
    // other arrays keep their 168-entry defaults from makeForecastResponse()
    stubClientApiFetches(response);

    const result = await buildWeatherDataFromOpenMeteo(40.71, -74.01, 'New York', 'imperial', 'US');

    expect(result.hourlyForecast!.length).toBe(48);
    expect(result.hourlyForecast![0].time).toBe('12 AM');
  });

  // Test 4: empty hourly time array yields an empty strip
  it('should yield an empty hourlyForecast and not throw when hourly.time is empty', async () => {
    const response = makeForecastResponse();
    response.hourly.time = [];
    response.hourly.temperature_2m = [];
    response.hourly.apparent_temperature = [];
    response.hourly.relative_humidity_2m = [];
    response.hourly.weather_code = [];
    response.hourly.wind_speed_10m = [];
    response.hourly.wind_direction_10m = [];
    response.hourly.uv_index = [];
    response.hourly.visibility = [];
    response.hourly.precipitation = [];
    response.hourly.precipitation_probability = [];
    stubClientApiFetches(response);

    const result = await buildWeatherDataFromOpenMeteo(40.71, -74.01, 'New York', 'imperial', 'US');

    expect(result.hourlyForecast).toEqual([]);
    // Daily forecast is processed independently and must still be intact.
    expect(result.forecast).toHaveLength(7);
  });
});
