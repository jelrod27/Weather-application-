/**
 * Weather Current Module
 *
 * Contains main functions for:
 * - Fetching current weather data
 * - Fetching weather by coordinates
 */

import type { WeatherData } from '../types';
import { parseLocationInput, geocodeLocation, reverseGeocodeLocation } from './weather-geocoding';
import { buildWeatherDataFromOpenMeteo } from './open-meteo-adapter';

// ============================================================================
// Main Weather Fetch Functions
// ============================================================================

/**
 * Fetch weather data for a location string
 */
export const fetchWeatherData = async (
  locationInput: string,
  unitSystem: 'metric' | 'imperial' = 'imperial'
): Promise<WeatherData> => {
  try {
    // Parse location input
    const locationQuery = parseLocationInput(locationInput);

    // Geocode location
    const { lat, lon, displayName, country } = await geocodeLocation(locationQuery);

    // Use Open-Meteo for current conditions and forecast.
    return buildWeatherDataFromOpenMeteo(lat, lon, displayName, unitSystem, country);
  } catch (error) {
    console.error('Error fetching weather data:', error);
    throw error;
  }
};

/**
 * Fetch weather by coordinates
 */
export const fetchWeatherByLocation = async (
  coords: string,
  unitSystem: 'metric' | 'imperial' = 'imperial',
  locationName?: string
): Promise<WeatherData> => {
  const [latitude, longitude] = coords.split(',').map(Number);

  if (isNaN(latitude) || isNaN(longitude)) {
    throw new Error('Invalid coordinates');
  }

  try {
    // Resolve display name and country via reverse geocoding
    let countryCode: string | undefined;
    let resolvedDisplayName = locationName;

    try {
      const reverseLocation = await reverseGeocodeLocation(latitude, longitude);
      countryCode = reverseLocation.country;
      if (!resolvedDisplayName) {
        resolvedDisplayName = reverseLocation.displayName;
      }
    } catch (error) {
      console.warn('Reverse geocoding failed for coordinates:', error);
    }

    const displayName = resolvedDisplayName || 'Selected Location';

    // Use Open-Meteo for current conditions and forecast.
    return buildWeatherDataFromOpenMeteo(latitude, longitude, displayName, unitSystem, countryCode);
  } catch (error) {
    console.error('Error fetching weather data:', error);
    throw error;
  }
};
