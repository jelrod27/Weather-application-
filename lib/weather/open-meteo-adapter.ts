/**
 * Open-Meteo Adapter
 *
 * Transforms Open-Meteo API responses into the app's WeatherData interface.
 *
 * Server: fetch upstream via lib/open-meteo (no HTTP self-proxy).
 * Client: fetch same-origin /api/open-meteo/* (CSP-safe; rate-limited).
 */

import type { WeatherData } from '../types';
import type {
  OpenMeteoAirQualityResponse,
  OpenMeteoForecastResponse,
} from '@/lib/open-meteo-types';
import {
  fetchOpenMeteoAirQuality,
  fetchOpenMeteoForecast,
} from '@/lib/open-meteo';
import {
  mapOpenMeteoPollenHourly,
  openMeteoLocalTimeToEpoch,
} from '@/lib/pollen/open-meteo-pollen';
import { normalizePollenCategories } from '@/lib/pollen/normalize-pollen-categories';
import { isServerRuntime } from '@/lib/runtime-env';
import { getAQIDescription } from '@/lib/air-quality-utils';
import { getWMODescription, getWMOCondition } from '../wmo-codes';
import {
  formatPressureByRegion,
  getCompassDirection,
  calculateMoonPhase,
  getApiUrl,
} from './weather-utils';
import { fetchPollenData } from './weather-forecast';

/** Format Open-Meteo city wall-clock hour ("…T14:00") as "2 PM" without runtime TZ. */
function formatHourlyLabel(naiveLocalTime: string): string {
  const timePart = naiveLocalTime.split('T')[1];
  if (!timePart) return 'N/A';
  const hours = parseInt(timePart.split(':')[0] ?? '', 10);
  if (Number.isNaN(hours)) return 'N/A';
  const h12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  const ampm = hours >= 12 ? 'PM' : 'AM';
  return `${h12} ${ampm}`;
}

type PollenPayload = WeatherData['pollen'];

const UNAVAILABLE_POLLEN: PollenPayload = {
  tree: { Tree: 'Unavailable' },
  grass: { Grass: 'Unavailable' },
  weed: { Weed: 'Unavailable' },
};

/** Map WMO codes to the app's legacy WeatherData condition labels. */
function wmoCodeToConditionLabel(code: number): string {
  const condition = getWMOCondition(code);
  switch (condition) {
    case 'sunny': return 'Clear';
    case 'cloudy': return 'Clouds';
    case 'rainy': return 'Rain';
    case 'snowy': return 'Snow';
    default: return 'Clear';
  }
}

function formatISOTimeToDisplay(isoString: string): string {
  const timePart = isoString.split('T')[1];
  if (!timePart) return 'N/A';
  const [hoursStr, minutesStr] = timePart.split(':');
  const hours = parseInt(hoursStr, 10);
  const minutes = parseInt(minutesStr, 10);
  if (isNaN(hours) || isNaN(minutes)) return 'N/A';
  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  const ampm = hours >= 12 ? 'pm' : 'am';
  const paddedMinutes = minutes.toString().padStart(2, '0');
  return `${displayHours}:${paddedMinutes} ${ampm}`;
}

function pollenFromAirQuality(
  airQuality: OpenMeteoAirQualityResponse | null,
): PollenPayload {
  if (!airQuality) return UNAVAILABLE_POLLEN;

  const mapped = mapOpenMeteoPollenHourly(
    airQuality.hourly,
    airQuality.utc_offset_seconds,
  );

  if (mapped.source !== 'open-meteo') {
    return {
      tree: mapped.tree,
      grass: mapped.grass,
      weed: mapped.weed,
    };
  }

  return normalizePollenCategories(mapped.tree, mapped.grass, mapped.weed);
}

async function fetchForecastAndAirQualityViaApi(
  lat: number,
  lon: number,
  temperatureUnit: 'celsius' | 'fahrenheit',
  windSpeedUnit: 'kmh' | 'mph',
  precipitationUnit: 'mm' | 'inch',
): Promise<{
  forecast: OpenMeteoForecastResponse;
  airQuality: OpenMeteoAirQualityResponse | null;
}> {
  const forecastQuery = new URLSearchParams({
    lat: String(lat),
    lon: String(lon),
    days: '7',
    temperature_unit: temperatureUnit,
    wind_speed_unit: windSpeedUnit,
    precipitation_unit: precipitationUnit,
  });

  const [forecastRes, airQualityRes] = await Promise.all([
    fetch(getApiUrl(`/api/open-meteo/forecast?${forecastQuery.toString()}`), {
      signal: AbortSignal.timeout(10000),
    }),
    fetch(getApiUrl(`/api/open-meteo/air-quality?lat=${lat}&lon=${lon}`), {
      signal: AbortSignal.timeout(10000),
    }).catch(() => null),
  ]);

  if (!forecastRes.ok) {
    throw new Error(`Open-Meteo proxy error: ${forecastRes.status}`);
  }

  const forecast = (await forecastRes.json()) as OpenMeteoForecastResponse;
  const airQuality = airQualityRes?.ok
    ? ((await airQualityRes.json()) as OpenMeteoAirQualityResponse)
    : null;

  return { forecast, airQuality };
}

async function fetchForecastAndAirQualityDirect(
  lat: number,
  lon: number,
  temperatureUnit: 'celsius' | 'fahrenheit',
  windSpeedUnit: 'kmh' | 'mph',
  precipitationUnit: 'mm' | 'inch',
): Promise<{
  forecast: OpenMeteoForecastResponse;
  airQuality: OpenMeteoAirQualityResponse | null;
}> {
  const [forecast, airQuality] = await Promise.all([
    fetchOpenMeteoForecast(lat, lon, {
      forecastDays: 7,
      temperatureUnit,
      windSpeedUnit,
      precipitationUnit,
    }),
    fetchOpenMeteoAirQuality(lat, lon).catch(() => null),
  ]);

  return { forecast, airQuality };
}

export async function buildWeatherDataFromOpenMeteo(
  lat: number,
  lon: number,
  displayName: string,
  unitSystem: 'metric' | 'imperial',
  countryCode?: string
): Promise<WeatherData> {
  const resolvedCountry = countryCode || 'US';
  const temperatureUnit = unitSystem === 'metric' ? 'celsius' as const : 'fahrenheit' as const;
  const windSpeedUnit = unitSystem === 'metric' ? 'kmh' as const : 'mph' as const;
  const precipitationUnit = unitSystem === 'metric' ? 'mm' as const : 'inch' as const;
  const onServer = isServerRuntime();

  // Client / Google path: pollen API in parallel with forecast+AQ.
  // Server without Google: derive pollen from the AQ payload after it returns.
  const pollenPromise =
    !onServer || process.env.GOOGLE_POLLEN_API_KEY
      ? fetchPollenData(lat, lon)
      : null;

  // Client must keep same-origin /api proxies (CSP + rate limit).
  // Server calls lib/open-meteo directly to avoid HTTP self-proxy / VERCEL_URL hops.
  const { forecast, airQuality } = onServer
    ? await fetchForecastAndAirQualityDirect(
        lat,
        lon,
        temperatureUnit,
        windSpeedUnit,
        precipitationUnit,
      )
    : await fetchForecastAndAirQualityViaApi(
        lat,
        lon,
        temperatureUnit,
        windSpeedUnit,
        precipitationUnit,
      );

  const pollenData = pollenPromise
    ? await pollenPromise
    : pollenFromAirQuality(airQuality);

  const current = forecast.current;
  const daily = forecast.daily;

  const temperature = Math.round(current?.temperature_2m ?? 0);
  const unit = unitSystem === 'imperial' ? '°F' : '°C';
  const weatherCode = current?.weather_code ?? 0;
  const condition = wmoCodeToConditionLabel(weatherCode);
  const description = getWMODescription(weatherCode).toLowerCase();

  const windSpeed = current?.wind_speed_10m ?? 0;
  const windDirection = current?.wind_direction_10m != null
    ? getCompassDirection(current.wind_direction_10m)
    : undefined;
  const windGust = current?.wind_gusts_10m;

  const pressureHPa = current?.surface_pressure ?? 1013;
  const pressure = formatPressureByRegion(pressureHPa, resolvedCountry);

  const sunrise = daily?.sunrise?.[0]
    ? formatISOTimeToDisplay(daily.sunrise[0])
    : 'N/A';
  const sunset = daily?.sunset?.[0]
    ? formatISOTimeToDisplay(daily.sunset[0])
    : 'N/A';

  const uvIndex = Math.round(current?.uv_index ?? 0);
  const aqi = airQuality?.current?.us_aqi ?? 0;
  const aqiCategory = getAQIDescription(aqi);
  const moonPhase = calculateMoonPhase();

  // Build 7-day forecast
  const forecastDays: WeatherData['forecast'] = [];
  if (daily?.time) {
    const count = Math.min(daily.time.length, 7);
    for (let i = 0; i < count; i++) {
      const dayDate = new Date(daily.time[i] + 'T12:00:00');
      const dayName = dayDate.toLocaleDateString('en-US', { weekday: 'long' });
      const dayWeatherCode = daily.weather_code?.[i] ?? 0;
      forecastDays.push({
        day: dayName,
        highTemp: Math.round(daily.temperature_2m_max?.[i] ?? 0),
        lowTemp: Math.round(daily.temperature_2m_min?.[i] ?? 0),
        condition: wmoCodeToConditionLabel(dayWeatherCode),
        description: getWMODescription(dayWeatherCode).toLowerCase(),
        details: {
          humidity: 0,
          windSpeed: Math.round(daily.wind_speed_10m_max?.[i] ?? 0),
          windDirection: undefined,
          pressure: `${Math.round(pressureHPa)} hPa`,
          cloudCover: 0,
          precipitationChance: daily.precipitation_probability_max?.[i] ?? 0,
          visibility: undefined,
          uvIndex: Math.round(daily.uv_index_max?.[i] ?? 0),
        },
        hourlyForecast: [],
      });
    }
  }
  while (forecastDays.length < 7) {
    const offset = forecastDays.length;
    const futureDate = new Date(Date.now() + offset * 86400000);
    forecastDays.push({
      day: futureDate.toLocaleDateString('en-US', { weekday: 'long' }),
      highTemp: 0, lowTemp: 0,
      condition: 'Clear', description: 'No data',
      details: {
        humidity: 0, windSpeed: 0, windDirection: undefined,
        pressure: '1013 hPa', cloudCover: 0, precipitationChance: 0,
        visibility: undefined, uvIndex: 0,
      },
      hourlyForecast: [],
    });
  }

  // Build hourly forecast (48 hours forward from now) from Open-Meteo hourly arrays
  // Open-Meteo returns hourly data starting at midnight — find the current hour first
  const hourlyForecast: WeatherData['hourlyForecast'] = [];
  const hourly = forecast.hourly;
  if (hourly?.time && hourly.time.length > 0) {
    const nowMs = Date.now();

    // hourly.time[] entries are tz-naive wall-clock strings in the CITY's
    // timezone (timezone=auto), e.g. "2026-06-09T14:00". Parsing them with
    // new Date() interprets them in the RUNTIME's timezone, which shifts the
    // window by the viewer<->city offset (a Tokyo lookup from New York
    // started ~13h in the past). Convert each entry to a true epoch using
    // utc_offset_seconds from the same response instead.
    const utcOffsetSeconds = forecast.utc_offset_seconds ?? 0;

    // Find the first hourly entry at or after the current time
    let startIdx = 0;
    for (let i = 0; i < hourly.time.length; i++) {
      if (openMeteoLocalTimeToEpoch(hourly.time[i], utcOffsetSeconds) >= nowMs - 30 * 60 * 1000) {
        startIdx = i;
        break;
      }
    }

    const hourlyCount = Math.min(hourly.time.length - startIdx, 48);
    for (let j = 0; j < hourlyCount; j++) {
      const i = startIdx + j;
      const hourTime = hourly.time[i];
      // dt must be a true UTC epoch so client "NOW" highlighting works for
      // remote cities (Lisbon viewer looking at Pleasanton, etc.).
      const dt = Math.floor(
        openMeteoLocalTimeToEpoch(hourTime, utcOffsetSeconds) / 1000,
      );
      const timeString = formatHourlyLabel(hourTime);

      const hourWeatherCode = hourly.weather_code?.[i] ?? 0;

      hourlyForecast.push({
        dt,
        time: timeString,
        temp: Math.round(hourly.temperature_2m?.[i] ?? 0),
        feelsLike: hourly.apparent_temperature?.[i],
        condition: wmoCodeToConditionLabel(hourWeatherCode),
        description: getWMODescription(hourWeatherCode).toLowerCase(),
        precipChance: Math.round(hourly.precipitation_probability?.[i] ?? 0),
        windSpeed: hourly.wind_speed_10m?.[i],
        windDirection: hourly.wind_direction_10m?.[i] != null
          ? getCompassDirection(hourly.wind_direction_10m[i])
          : undefined,
        humidity: hourly.relative_humidity_2m?.[i],
        uvIndex: hourly.uv_index?.[i] != null ? Math.round(hourly.uv_index[i]) : undefined,
        icon: undefined,
      });
    }

    // Surface the current-hour visibility on day 0. Open-Meteo reports
    // visibility in meters; the Visibility card renders miles. Without this
    // the card always showed "N/A" with a default-driven "Clear" badge,
    // even in dense fog — the data was fetched and discarded.
    const visibilityMeters = hourly.visibility?.[startIdx];
    const day0Details = forecastDays[0]?.details;
    if (visibilityMeters != null && day0Details) {
      day0Details.visibility =
        Math.round((visibilityMeters / 1609.34) * 10) / 10;
    }
  }

  return {
    location: displayName,
    country: resolvedCountry,
    temperature,
    unit,
    condition,
    description,
    humidity: current?.relative_humidity_2m ?? 0,
    wind: { speed: windSpeed, direction: windDirection, gust: windGust },
    pressure,
    sunrise,
    sunset,
    timezone: forecast.timezone,
    timezoneAbbreviation: forecast.timezone_abbreviation,
    utcOffsetSeconds: forecast.utc_offset_seconds,
    coordinates: { lat, lon },
    forecast: forecastDays,
    moonPhase,
    uvIndex,
    aqi,
    aqiCategory,
    pollen: pollenData,
    hourlyForecast,
  };
}
