/**
 * Weather Forecast Module
 *
 * Contains functions for:
 * - Processing daily forecast data
 * - Processing hourly forecast data
 * - Fetching supplementary weather data (UV, pollen, air quality)
 */

import { HourlyForecast, EnhancedHourlyForecast } from '../types';
import {
  getApiUrl,
  getWindDirection,
  mapWeatherCondition,
  fahrenheitToCelsius
} from './weather-utils';

// ============================================================================
// Types
// ============================================================================

export interface OpenWeatherMapForecastResponse {
  list: Array<{
    dt: number;
    main: {
      temp: number;
      temp_min: number;
      temp_max: number;
      humidity: number;
      pressure: number;
    };
    weather: Array<{
      main: string;
      description: string;
    }>;
    wind?: {
      speed: number;
      deg?: number;
    };
    clouds?: {
      all: number;
    };
    pop?: number;
  }>;
}

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
// Daily Forecast Processing
// ============================================================================

/**
 * Process 5-day forecast data to extract daily high/low temperatures with detailed metrics
 */
export const processDailyForecast = (
  forecastData: OpenWeatherMapForecastResponse,
  useFahrenheit: boolean
): DailyForecast[] => {
  const dailyData: { [key: string]: {
    high: number;
    low: number;
    condition: string;
    description: string;
    humidity: number[];
    pressure: number[];
    windSpeed: number[];
    windDir: string[];
    cloudCover: number[];
    precipChance: number[];
    hourlyForecast: HourlyForecast[];
  } } = {};

  forecastData.list.forEach((item) => {
    const date = new Date(item.dt * 1000).toLocaleDateString('en-US', { weekday: 'long' });
    const time = new Date(item.dt * 1000).toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });

    if (!dailyData[date]) {
      dailyData[date] = {
        high: item.main.temp,
        low: item.main.temp,
        condition: item.weather?.[0]?.main ?? 'Unknown',
        description: item.weather?.[0]?.description ?? '',
        humidity: [],
        pressure: [],
        windSpeed: [],
        windDir: [],
        cloudCover: [],
        precipChance: [],
        hourlyForecast: []
      };
    } else {
      dailyData[date].high = Math.max(dailyData[date].high, item.main.temp);
      dailyData[date].low = Math.min(dailyData[date].low, item.main.temp);
    }

    // Collect detailed metrics for averaging
    dailyData[date].humidity.push(item.main.humidity);
    dailyData[date].pressure.push(item.main.pressure);
    dailyData[date].windSpeed.push(item.wind?.speed || 0);
    if (item.wind?.deg) {
      dailyData[date].windDir.push(getWindDirection(item.wind.deg));
    }
    dailyData[date].cloudCover.push(item.clouds?.all || 0);

    // Use actual API precipitation probability or fallback calculation
    let precipChance = 0;
    if (item.pop !== undefined) {
      precipChance = Math.round(item.pop * 100);
    } else {
      precipChance = (item.weather?.[0]?.main ?? '').toLowerCase().includes('rain')
        ? Math.min((item.main.humidity / 100) * 100, 85)
        : 0;
    }
    dailyData[date].precipChance.push(precipChance);

    // Add to hourly forecast (first 8 entries per day)
    if (dailyData[date].hourlyForecast.length < 8) {
      dailyData[date].hourlyForecast.push({
        time: time,
        temp: useFahrenheit ? Math.round(item.main.temp) : fahrenheitToCelsius(item.main.temp),
        condition: mapWeatherCondition(item.weather?.[0]?.main ?? 'Unknown'),
        precipChance: Math.round(precipChance)
      });
    }
  });

  return Object.entries(dailyData).map(([day, data]) => {
    // Calculate averages for detailed metrics
    const avgHumidity = Math.round(data.humidity.reduce((a, b) => a + b, 0) / data.humidity.length);
    const avgPressure = Math.round(data.pressure.reduce((a, b) => a + b, 0) / data.pressure.length);
    const avgWindSpeed = Math.round(data.windSpeed.reduce((a, b) => a + b, 0) / data.windSpeed.length);
    const avgCloudCover = Math.round(data.cloudCover.reduce((a, b) => a + b, 0) / data.cloudCover.length);
    const avgPrecipChance = Math.round(data.precipChance.reduce((a, b) => a + b, 0) / data.precipChance.length);

    // Get most common wind direction
    const windDirection = data.windDir.length > 0
      ? data.windDir.sort((a, b) =>
          data.windDir.filter(v => v === a).length - data.windDir.filter(v => v === b).length
        ).pop()
      : undefined;

    return {
      day,
      date: new Date(Date.now() + (Object.keys(dailyData).indexOf(day) * 24 * 60 * 60 * 1000))
        .toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      highTemp: useFahrenheit ? Math.round(data.high) : fahrenheitToCelsius(data.high),
      lowTemp: useFahrenheit ? Math.round(data.low) : fahrenheitToCelsius(data.low),
      condition: mapWeatherCondition(data.condition),
      description: data.description,
      details: {
        humidity: avgHumidity,
        windSpeed: avgWindSpeed,
        windDirection: windDirection,
        pressure: `${avgPressure} hPa`,
        cloudCover: avgCloudCover,
        precipitationChance: avgPrecipChance,
        visibility: undefined,
        uvIndex: undefined
      },
      hourlyForecast: data.hourlyForecast
    };
  });
};

// ============================================================================
// Hourly Forecast Processing
// ============================================================================

/**
 * Process hourly forecast data from One Call API
 */
export const processHourlyForecast = (
  hourlyData: Array<{
    dt: number;
    temp?: number;
    feels_like?: number;
    weather?: Array<{ main?: string; description?: string; icon?: string }>;
    pop?: number;
    wind_speed?: number;
    wind_deg?: number;
    humidity?: number;
    uvi?: number;
  }>,
  timezoneOffset: number = 0
): EnhancedHourlyForecast[] => {
  if (!Array.isArray(hourlyData) || hourlyData.length === 0) {
    return [];
  }

  // Process up to 48 hours
  return hourlyData.slice(0, 48).map((hour) => {
    const dt = hour.dt;

    // Format time with timezone offset
    const localTime = new Date((dt + timezoneOffset) * 1000);
    const hours = localTime.getUTCHours();
    const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const timeString = `${displayHours} ${ampm}`;

    return {
      dt: dt,
      time: timeString,
      temp: hour.temp ?? 0,
      feelsLike: hour.feels_like,
      condition: hour.weather?.[0]?.main || 'Clear',
      description: hour.weather?.[0]?.description || 'clear sky',
      precipChance: Math.round((hour.pop ?? 0) * 100),
      windSpeed: hour.wind_speed,
      windDirection: hour.wind_deg != null ? getWindDirection(hour.wind_deg) : undefined,
      humidity: hour.humidity,
      uvIndex: hour.uvi != null ? Math.round(hour.uvi) : undefined,
      icon: hour.weather?.[0]?.icon
    };
  });
};

// ============================================================================
// Supplementary Data Fetching
// ============================================================================

/**
 * Fetch UV Index using internal API endpoint
 */
export const fetchUVIndex = async (lat: number, lon: number): Promise<number> => {
  try {
    const response = await fetch(getApiUrl(`/api/weather/uv?lat=${lat}&lon=${lon}`));

    if (!response.ok) {
      return 0;
    }

    const data = await response.json();
    return data.uvi || 0;
  } catch {
    return 0;
  }
};

/**
 * Fetch Pollen data using internal API endpoint
 */
export const fetchPollenData = async (
  lat: number,
  lon: number
): Promise<{ tree: Record<string, string>; grass: Record<string, string>; weed: Record<string, string> }> => {
  const noData = {
    tree: { 'Tree': 'No Data' },
    grass: { 'Grass': 'No Data' },
    weed: { 'Weed': 'No Data' }
  };

  try {
    const response = await fetch(getApiUrl(`/api/weather/pollen?lat=${lat}&lon=${lon}`));

    if (!response.ok) {
      return noData;
    }

    const data = await response.json();
    return {
      tree: data.tree || { 'Tree': 'No Data' },
      grass: data.grass || { 'Grass': 'No Data' },
      weed: data.weed || { 'Weed': 'No Data' }
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

/**
 * Ensure we have 5 days of forecast data by filling from hourly if needed
 */
export const ensureFiveDays = (
  list: DailyForecast[],
  oneCall: {
    current?: { dt?: number };
    hourly?: Array<{
      dt: number;
      temp: number;
      humidity?: number;
      wind_speed?: number;
      wind_deg?: number;
      pressure?: number;
      clouds?: number;
      pop?: number;
      weather?: Array<{ main?: string; description?: string }>;
    }>;
  }
): DailyForecast[] => {
  const result = [...list];
  const now = oneCall?.current?.dt ?? Math.floor(Date.now() / 1000);
  let dayIndex = result.length;

  while (result.length < 5) {
    const start = now + dayIndex * 86400;
    const end = start + 86400;
    const hours = Array.isArray(oneCall.hourly)
      ? oneCall.hourly.filter((h) => h.dt >= start && h.dt < end)
      : [];

    if (hours.length > 0) {
      const temps = hours.map(h => h.temp);
      const high = Math.max(...temps);
      const low = Math.min(...temps);
      const humidity = Math.round(hours.reduce((a, b) => a + (b.humidity ?? 0), 0) / hours.length);
      const windSpeed = Math.round(hours.reduce((a, b) => a + (b.wind_speed ?? 0), 0) / hours.length);
      const windDeg = Math.round(hours.reduce((a, b) => a + (b.wind_deg ?? 0), 0) / hours.length);
      const pressure = Math.round(hours.reduce((a, b) => a + (b.pressure ?? 1013), 0) / hours.length);
      const clouds = Math.round(hours.reduce((a, b) => a + (b.clouds ?? 0), 0) / hours.length);
      const pop = Math.min(100, Math.round((hours.reduce((a, b) => a + (b.pop ?? 0), 0) / hours.length) * 100));
      const wx = hours.find(h => h.weather?.[0])?.weather?.[0];

      result.push({
        day: new Date(start * 1000).toLocaleDateString('en-US', { weekday: 'long' }),
        highTemp: Math.round(high),
        lowTemp: Math.round(low),
        condition: wx?.main || 'Clear',
        description: wx?.description || 'clear sky',
        details: {
          humidity,
          windSpeed,
          windDirection: getWindDirection(windDeg),
          pressure: `${pressure} hPa`,
          cloudCover: clouds,
          precipitationChance: pop,
          visibility: undefined,
          uvIndex: 0,
        },
        hourlyForecast: [],
      });
    } else {
      // Graceful placeholder
      result.push({
        day: new Date(start * 1000).toLocaleDateString('en-US', { weekday: 'long' }),
        highTemp: 0,
        lowTemp: 0,
        condition: 'Clear',
        description: 'No data',
        details: {
          humidity: 0,
          windSpeed: 0,
          windDirection: undefined,
          pressure: '1013 hPa',
          cloudCover: 0,
          precipitationChance: 0,
          visibility: undefined,
          uvIndex: 0
        },
        hourlyForecast: [],
      });
    }
    dayIndex += 1;
  }

  return result;
};

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
