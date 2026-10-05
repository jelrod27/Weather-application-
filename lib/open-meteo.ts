/**
 * Open-Meteo Service Layer
 *
 * Server-side fetch functions for the Open-Meteo Forecast and Air Quality APIs.
 * All functions return typed responses. No API key required.
 */

import { fetchWithTimeout } from '@/lib/fetch-with-timeout';
import { isInConus } from '@/lib/geo/point-in-polygon';
import {
  applyNbmForecastTemperatures,
  NBM_DAILY_TEMPERATURES,
  NBM_HOURLY_TEMPERATURES,
} from '@/lib/weather/open-meteo-temperature-source';
import type { OpenMeteoForecastResponse, OpenMeteoAirQualityResponse } from '@/lib/open-meteo-types';

const FORECAST_BASE = 'https://api.open-meteo.com/v1/forecast';
const AIR_QUALITY_BASE = 'https://air-quality-api.open-meteo.com/v1/air-quality';

/**
 * Fetch current conditions + hourly + daily forecast from Open-Meteo.
 * Uses imperial units (fahrenheit, mph, inch) by default to match the app's US-first approach.
 * Callers request their display units; forecasts require no second conversion.
 * Resolved mainland-US locations use NBM forecast temperatures with Best Match
 * for current conditions and ancillary metrics. See PRD-forecast-temperature-quality.
 */
export async function fetchOpenMeteoForecast(
  lat: number,
  lon: number,
  options?: {
    /** Resolved geocoding country, not a default inferred from units or language. */
    countryCode?: string;
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
    countryCode,
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
    'is_day',
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

  const baseline = requestForecast(url);
  // Country plus bounds excludes Canada/Mexico, Alaska, Hawaii and territories.
  // Limit this policy to the displayed short-range forecast; history and longer
  // horizons keep the existing source until separately evaluated.
  if (countryCode?.toUpperCase() !== 'US' || !isInConus(lat, lon) ||
      (pastDays ?? 0) > 0 || forecastDays > 7) return baseline;

  const nbmUrl = new URL(url);
  nbmUrl.searchParams.set('models', 'ncep_nbm_conus');
  nbmUrl.searchParams.delete('current');
  nbmUrl.searchParams.set('hourly', NBM_HOURLY_TEMPERATURES.join(','));
  nbmUrl.searchParams.set('daily', NBM_DAILY_TEMPERATURES.join(','));
  // Optional request runs alongside Best Match. A slow or unavailable regional
  // model must not add a retry chain to the required weather request.
  const [base, nbm] = await Promise.all([
    baseline,
    requestForecast(nbmUrl, true).catch(() => null),
  ]);
  return applyNbmForecastTemperatures(base, nbm);
}

async function requestForecast(url: URL, optional = false): Promise<OpenMeteoForecastResponse> {
  const response = await fetchWithTimeout(url.toString(), {
    timeoutMs: optional ? 3000 : 8000,
    ...(optional ? { maxRetries: 0 } : {}),
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
