/**
 * Weather Forecast Module
 *
 * Contains functions for:
 * - Processing Open-Meteo daily forecast data
 * - Fetching supplementary weather data (pollen, air quality)
 */

import type { HourlyForecast } from '../types';
import { getApiUrl } from './weather-utils';

// ============================================================================
// Types
// ============================================================================

export interface DailyForecast {
  day: string;
  date?: string;
  highTemp: number;
  lowTemp: number;
  condition: string;
  description: string;
  details: {
    humidity: number;
    windSpeed: number;
    windDirection?: string;
    pressure: string;
    cloudCover: number;
    precipitationChance: number;
    visibility?: number;
    uvIndex?: number;
  };
  hourlyForecast: HourlyForecast[];
}

// ============================================================================
// Supplementary Data Fetching
// ============================================================================

/**
 * Fetch Pollen data using internal API endpoint
 */
export const fetchPollenData = async (
  lat: number,
  lon: number
): Promise<{ tree: Record<string, string>; grass: Record<string, string>; weed: Record<string, string> }> => {
  const noData = {
    tree: { Tree: 'Unavailable' },
    grass: { Grass: 'Unavailable' },
    weed: { Weed: 'Unavailable' },
  };

  try {
    const response = await fetch(getApiUrl(`/api/weather/pollen?lat=${lat}&lon=${lon}`));

    if (!response.ok) {
      return noData;
    }

    const data = await response.json();
    return {
      tree: data.tree || { Tree: 'Unavailable' },
      grass: data.grass || { Grass: 'Unavailable' },
      weed: data.weed || { Weed: 'Unavailable' },
    };
  } catch {
    return noData;
  }
};

// Pollutant data from air quality API
export interface AirQualityPollutants {
  pm2_5?: number;
  pm10?: number;
  ozone?: number;
  nitrogen_dioxide?: number;
  sulphur_dioxide?: number;
  carbon_monoxide?: number;
}

/**
 * Fetch Air Quality data using internal API endpoint
 */
export const fetchAirQualityData = async (
  lat: number,
  lon: number,
  _cityName?: string
): Promise<{ aqi: number; category: string; pollutants?: AirQualityPollutants }> => {
  const noData = { aqi: 0, category: 'No Data' };

  try {
    const response = await fetch(getApiUrl(`/api/weather/air-quality?lat=${lat}&lon=${lon}`));

    if (!response.ok) {
      return noData;
    }

    const data = await response.json();
    return {
      aqi: data.aqi || 0,
      category: data.category || 'No Data',
      pollutants: data.pollutants,
    };
  } catch {
    return noData;
  }
};

// ============================================================================
// Open-Meteo Forecast Processing
// ============================================================================

/** WMO weather code to human-readable description */
function getWMODescription(code: number): string {
  const descriptions: Record<number, string> = {
    0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
    45: 'Fog', 48: 'Depositing rime fog',
    51: 'Light drizzle', 53: 'Moderate drizzle', 55: 'Dense drizzle',
    56: 'Light freezing drizzle', 57: 'Dense freezing drizzle',
    61: 'Slight rain', 63: 'Moderate rain', 65: 'Heavy rain',
    66: 'Light freezing rain', 67: 'Heavy freezing rain',
    71: 'Slight snow fall', 73: 'Moderate snow fall', 75: 'Heavy snow fall', 77: 'Snow grains',
    80: 'Slight rain showers', 81: 'Moderate rain showers', 82: 'Violent rain showers',
    85: 'Slight snow showers', 86: 'Heavy snow showers',
    95: 'Thunderstorm', 96: 'Thunderstorm with slight hail', 99: 'Thunderstorm with heavy hail',
  };
  return descriptions[code] ?? 'Unknown';
}

/** WMO weather code to normalized condition string for WeatherIconModern */
function getWMOCondition(code: number): string {
  if (code === 0 || code === 1) return 'sunny';
  if (code === 2 || code === 3) return 'cloudy';
  if (code === 45 || code === 48) return 'cloudy';
  if (code >= 51 && code <= 67) return 'rainy';
  if (code >= 71 && code <= 86) return 'snowy';
  if (code >= 95) return 'rainy';
  return 'sunny';
}

/** Transform Open-Meteo daily parallel arrays into DailyForecast[] */
export const processDailyForecastFromOpenMeteo = (
  daily: { time: string[]; temperature_2m_max: number[]; temperature_2m_min: number[]; weather_code: number[]; precipitation_probability_max: number[]; wind_speed_10m_max: number[]; uv_index_max: number[] }
): DailyForecast[] => {
  const result: DailyForecast[] = [];

  for (let i = 0; i < daily.time.length; i++) {
    const date = new Date(daily.time[i] + 'T00:00:00');
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });

    result.push({
      day: dayName,
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      highTemp: Math.round(daily.temperature_2m_max[i]),
      lowTemp: Math.round(daily.temperature_2m_min[i]),
      condition: getWMOCondition(daily.weather_code[i]),
      description: getWMODescription(daily.weather_code[i]),
      details: {
        humidity: 0,
        windSpeed: Math.round(daily.wind_speed_10m_max[i]),
        pressure: '0 hPa',
        cloudCover: 0,
        precipitationChance: Math.round(daily.precipitation_probability_max[i]),
        uvIndex: Math.round(daily.uv_index_max[i]),
      },
      hourlyForecast: [],
    });
  }

  return result;
};
