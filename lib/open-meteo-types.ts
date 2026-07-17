/**
 * Open-Meteo API Response Types
 *
 * TypeScript interfaces for the Open-Meteo Forecast API and Air Quality API responses.
 * See: https://open-meteo.com/en/docs
 */

// === Forecast API (https://api.open-meteo.com/v1/forecast) ===

export interface OpenMeteoUnits {
  [key: string]: string;
}

export interface OpenMeteoCurrent {
  time: string;
  interval: number;
  temperature_2m: number;
  relative_humidity_2m: number;
  apparent_temperature: number;
  is_day: number;
  precipitation: number;
  weather_code: number;
  cloud_cover: number;
  surface_pressure: number;
  wind_speed_10m: number;
  wind_direction_10m: number;
  wind_gusts_10m: number;
  uv_index: number;
  [key: string]: string | number;
}

export interface OpenMeteoHourly {
  time: string[];
  temperature_2m: number[];
  apparent_temperature: number[];
  relative_humidity_2m: number[];
  weather_code: number[];
  wind_speed_10m: number[];
  wind_direction_10m: number[];
  uv_index: number[];
  visibility: number[];
  precipitation: number[];
  precipitation_probability: number[];
  [key: string]: string[] | number[];
}

export interface OpenMeteoDaily {
  time: string[];
  weather_code: number[];
  temperature_2m_max: number[];
  temperature_2m_min: number[];
  apparent_temperature_max: number[];
  apparent_temperature_min: number[];
  sunrise: string[];
  sunset: string[];
  daylight_duration: number[];
  uv_index_max: number[];
  precipitation_sum: number[];
  precipitation_probability_max: number[];
  wind_speed_10m_max: number[];
  wind_gusts_10m_max: number[];
}

export interface OpenMeteoForecastResponse {
  latitude: number;
  longitude: number;
  generationtime_ms: number;
  utc_offset_seconds: number;
  timezone: string;
  timezone_abbreviation: string;
  elevation: number;
  current_units?: OpenMeteoUnits;
  current?: OpenMeteoCurrent;
  hourly_units?: OpenMeteoUnits;
  hourly?: OpenMeteoHourly;
  daily_units?: OpenMeteoUnits;
  daily?: OpenMeteoDaily;
}

// === Air Quality API (https://air-quality-api.open-meteo.com/v1/air-quality) ===

export interface OpenMeteoAirQualityCurrent {
  time: string;
  interval: number;
  us_aqi: number;
  pm10: number;
  pm2_5: number;
  carbon_monoxide: number;
  nitrogen_dioxide: number;
  sulphur_dioxide: number;
  ozone: number;
  dust: number;
  uv_index: number;
}

export interface OpenMeteoAirQualityHourly {
  time: string[];
  alder_pollen?: (number | null)[];
  birch_pollen?: (number | null)[];
  grass_pollen?: (number | null)[];
  mugwort_pollen?: (number | null)[];
  olive_pollen?: (number | null)[];
  ragweed_pollen?: (number | null)[];
}

export interface OpenMeteoAirQualityResponse {
  latitude: number;
  longitude: number;
  generationtime_ms: number;
  utc_offset_seconds: number;
  timezone: string;
  timezone_abbreviation: string;
  current: OpenMeteoAirQualityCurrent;
  current_units: Record<string, string>;
  hourly?: OpenMeteoAirQualityHourly;
  hourly_units?: Record<string, string>;
}
