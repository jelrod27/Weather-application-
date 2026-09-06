/**
 * 16-Bit Weather Platform - v1.0.0
 * 
 * Copyright (C) 2025 16-Bit Weather
 * Licensed under Fair Source License, Version 0.9
 * 
 * Use Limitation: 5 users
 * See LICENSE file for full terms
 * 
 * BETA SOFTWARE NOTICE:
 * This software is in active development. Features may change.
 * Report issues: https://github.com/jelrod27/Weather-application-/issues
 */

export interface ForecastDay {
  day: string;
  highTemp: number;
  lowTemp: number;
  condition: string;
  description: string;
  country?: string;
  details?: {
    precipitationChance?: number;
    humidity?: number;
    windSpeed?: number;
    windDirection?: string;
    pressure?: string;
    cloudCover?: number;
    visibility?: number;
    uvIndex?: number;
  };
}

export interface HourlyForecast {
  time: string;
  temp: number;
  condition: string;
  precipChance: number;
  windSpeed?: number;
  windDirection?: string;
  humidity?: number;
}

// Enhanced hourly forecast data with additional details
export interface EnhancedHourlyForecast {
  dt: number;          // Unix timestamp
  time: string;        // Formatted time (e.g., "2 PM")
  temp: number;
  feelsLike?: number;
  condition: string;
  description: string;
  precipChance: number;
  windSpeed?: number;
  windDirection?: string;
  humidity?: number;
  uvIndex?: number;
  icon?: string;
}

export interface WeatherData {
  location: string;
  country: string;
  temperature: number;
  unit: string;
  condition: string;
  description: string;
  humidity: number;
  wind: {
    speed: number;
    direction?: string;
    gust?: number;
  };
  pressure: string;
  sunrise: string;
  sunset: string;
  /** IANA timezone for the location (e.g. America/Los_Angeles) from Open-Meteo. */
  timezone?: string;
  /** Short timezone label from Open-Meteo (e.g. PDT). */
  timezoneAbbreviation?: string;
  /** Seconds east of UTC for the location at forecast time. */
  utcOffsetSeconds?: number;
  coordinates?: {
    lat: number;
    lon: number;
  };
  forecast: Array<{
    day: string;
    highTemp: number;
    lowTemp: number;
    condition: string;
    description: string;
    details?: {
      humidity?: number;
      windSpeed?: number;
      windDirection?: string;
      pressure?: string;
      cloudCover?: number;
      precipitationChance?: number;
      visibility?: number;
      uvIndex?: number;
    };
    hourlyForecast?: HourlyForecast[];
  }>;
  moonPhase: {
    phase: string;
    illumination: number;
    emoji: string;
    phaseAngle: number;
    nextFullMoon: string;
    nextMoonset: string;
  };
  uvIndex: number;
  aqi: number;
  aqiCategory?: string;
  pollutants?: {
    pm2_5?: number;
    pm10?: number;
    ozone?: number;
    nitrogen_dioxide?: number;
    sulphur_dioxide?: number;
    carbon_monoxide?: number;
  };
  pollen: {
    tree: Record<string, string>;
    grass: Record<string, string>;
    weed: Record<string, string>;
  };
  hourlyForecast?: EnhancedHourlyForecast[]; // 48-hour forecast data
}

interface HistoricalData {
  daily: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
  };
  daily_units: {
    time: string;
    temperature_2m_max: string;
    temperature_2m_min: string;
  };
  latitude: number;
  longitude: number;
  timezone: string;
  timezone_abbreviation: string;
  utc_offset_seconds: number;
}

// Precipitation data for authenticated users
export interface PrecipitationData {
  // Current precipitation rate (inches per hour)
  currentRain: number;
  currentSnow: number;
  // 24-hour weighted totals (inches) - calculated from daily aggregates
  rain24h: number;
  snow24h: number;
  // Individual day totals (inches)
  todayRain: number;
  yesterdayRain: number;
  todaySnow: number;
  yesterdaySnow: number;
  // Timestamps
  lastUpdated: string;
  dataSource: 'day_summary' | 'timemachine';
  // Data availability - false if all API calls failed
  dataAvailable: boolean;
  // Data quality - 'full' if both days available, 'partial' if only one
  dataQuality: 'full' | 'partial';
}

// Extended weather data with precipitation for authenticated users
interface AuthenticatedWeatherData extends WeatherData {
  precipitation?: PrecipitationData;
} 