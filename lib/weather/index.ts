/**
 * Weather API Module - Barrel Export
 *
 * This module re-exports all weather-related functions for backward compatibility.
 * Import from 'lib/weather' instead of 'lib/weather-api' for the new modular structure.
 */

// ============================================================================
// Main Weather Functions
// ============================================================================

export {
  fetchWeatherData,
  fetchWeatherByLocation
} from './weather-current';

// ============================================================================
// Geocoding Functions
// ============================================================================

export {
  parseLocationInput,
  geocodeLocation,
  getLocationNotFoundError,
  type LocationQuery,
  type GeocodingResponse,
  type GeocodedLocation
} from './weather-geocoding';

// ============================================================================
// Forecast Functions
// ============================================================================

export {
  processDailyForecastFromOpenMeteo,
  fetchPollenData,
  fetchAirQualityData,
  type DailyForecast,
  type AirQualityPollutants
} from './weather-forecast';

// ============================================================================
// Utility Functions
// ============================================================================

export {
  // API URL Helper
  getApiUrl,

  // Unit System Detection
  shouldUseMetricUnits,
  isUSALocation,
  shouldUseFahrenheit,
  shouldUseInchesOfMercury,

  // Temperature Functions
  celsiusToFahrenheit,
  fahrenheitToCelsius,
  formatTemperature,
  calculateDewPoint,

  // Wind Functions
  getCompassDirection,
  getWindDirection,

  // Time Functions
  formatTime,

  // Pressure Functions
  formatPressureByRegion,

  // UV Index Functions
  getUVDescription,

  // Moon Phase Functions
  calculateMoonPhase,

  // Weather Condition Mapping
  mapWeatherCondition,

  // Input Normalization
  normalizeInput,

  // Types
  type MoonPhaseInfo
} from './weather-utils';
