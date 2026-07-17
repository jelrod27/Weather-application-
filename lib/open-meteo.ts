/**
 * Open-Meteo Service Layer
 *
 * Server-side fetch functions for the Open-Meteo Forecast and Air Quality APIs.
 * All functions return typed responses. No API key required.
 */

import type {
  OpenMeteoForecastResponse,
  OpenMeteoAirQualityResponse,
} from '@/lib/open-meteo-types';
import { fetchWithTimeout } from '@/lib/fetch-with-timeout';

const FORECAST_BASE = 'https://api.open-meteo.com/v1/forecast';
const AIR_QUALITY_BASE = 'https://air-quality-api.open-meteo.com/v1/air-quality';

/**
 * Fetch current conditions + hourly + daily forecast from Open-Meteo.
 * Uses imperial units (fahrenheit, mph, inch) by default to match the app's US-first approach.
 * The app handles metric conversion client-side based on user preference.
 */
export async function fetchOpenMeteoForecast(
  lat: number,
  lon: number,
  options?: {
    forecastDays?: number;
    pastDays?: number;
    temperatureUnit?: 'fahrenheit' | 'celsius';
    windSpeedUnit?: 'mph' | 'kmh' | 'ms' | 'kn';
    precipitationUnit?: 'inch' | 'mm';
    extraCurrentVars?: string[];
    extraHourlyVars?: string[];
  }
): Promise<OpenMeteoForecastResponse> {
  const {
    forecastDays = 7,
    pastDays,
    temperatureUnit = 'fahrenheit',
    windSpeedUnit = 'mph',
    precipitationUnit = 'inch',
    extraCurrentVars = [],
    extraHourlyVars = [],
  } = options ?? {};

  const currentVars = [
    'temperature_2m',
    'relative_humidity_2m',
    'apparent_temperature',
    'is_day',
    'precipitation',
    'weather_code',
    'cloud_cover',
    'surface_pressure',
    'wind_speed_10m',
    'wind_direction_10m',
    'wind_gusts_10m',
    'uv_index',
    ...extraCurrentVars,
  ];

  const hourlyVars = [
    'temperature_2m',
    'apparent_temperature',
    'relative_humidity_2m',
    'weather_code',
    'wind_speed_10m',
    'wind_direction_10m',
    'uv_index',
    'visibility',
    'precipitation',
    'precipitation_probability',
    ...extraHourlyVars,
  ];

  const dailyVars = [
    'weather_code',
    'temperature_2m_max',
    'temperature_2m_min',
    'apparent_temperature_max',
    'apparent_temperature_min',
    'sunrise',
    'sunset',
    'daylight_duration',
    'uv_index_max',
    'precipitation_sum',
    'precipitation_probability_max',
    'wind_speed_10m_max',
    'wind_gusts_10m_max',
  ];

  const url = new URL(FORECAST_BASE);
  url.searchParams.set('latitude', lat.toString());
  url.searchParams.set('longitude', lon.toString());
  url.searchParams.set('current', currentVars.join(','));
  url.searchParams.set('hourly', hourlyVars.join(','));
  url.searchParams.set('daily', dailyVars.join(','));
  url.searchParams.set('temperature_unit', temperatureUnit);
  url.searchParams.set('wind_speed_unit', windSpeedUnit);
  url.searchParams.set('precipitation_unit', precipitationUnit);
  url.searchParams.set('timezone', 'auto');
  url.searchParams.set('forecast_days', forecastDays.toString());
  if (pastDays != null && pastDays > 0) {
    url.searchParams.set('past_days', pastDays.toString());
  }

  const response = await fetchWithTimeout(url.toString(), {
    timeoutMs: 8000,
    headers: { 'User-Agent': '16-Bit-Weather/open-meteo' },
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(
      `Open-Meteo Forecast API error ${response.status}: ${text}`
    );
  }

  return response.json() as Promise<OpenMeteoForecastResponse>;
}

/**
 * Fetch current air quality data from Open-Meteo.
 * Returns US EPA AQI composite plus individual pollutant concentrations.
 */
export async function fetchOpenMeteoAirQuality(
  lat: number,
  lon: number
): Promise<OpenMeteoAirQualityResponse> {
  const url = new URL(AIR_QUALITY_BASE);
  url.searchParams.set('latitude', lat.toString());
  url.searchParams.set('longitude', lon.toString());
  url.searchParams.set(
    'current',
    [
      'us_aqi',
      'pm10',
      'pm2_5',
      'carbon_monoxide',
      'nitrogen_dioxide',
      'sulphur_dioxide',
      'ozone',
      'dust',
      'uv_index',
    ].join(',')
  );
  // CAMS European pollen (grains/m³). Null outside Europe / off-season.
  url.searchParams.set(
    'hourly',
    [
      'alder_pollen',
      'birch_pollen',
      'grass_pollen',
      'mugwort_pollen',
      'olive_pollen',
      'ragweed_pollen',
    ].join(','),
  );
  url.searchParams.set('forecast_days', '1');
  url.searchParams.set('timezone', 'auto');

  const response = await fetchWithTimeout(url.toString(), {
    timeoutMs: 8000,
    headers: { 'User-Agent': '16-Bit-Weather/open-meteo' },
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(
      `Open-Meteo Air Quality API error ${response.status}: ${text}`
    );
  }

  return response.json() as Promise<OpenMeteoAirQualityResponse>;
}
