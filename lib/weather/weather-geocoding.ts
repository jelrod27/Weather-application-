/**
 * Weather Geocoding Module
 *
 * Contains functions for:
 * - Location parsing and validation
 * - Geocoding (location to coordinates)
 * - Error message generation
 */

import { getApiUrl, normalizeInput } from './weather-utils';

// ============================================================================
// Types
// ============================================================================

export interface LocationQuery {
  query: string;
  type: 'zip' | 'city_state' | 'city_country' | 'city_only';
  city?: string;
  state?: string;
  country?: string;
  zipCode?: string;
}

export interface GeocodingResponse {
  name: string;
  local_names?: { [key: string]: string };
  lat: number;
  lon: number;
  country: string;
  state?: string;
  /**
   * Postal code, when known (Nominatim reverse + Zippopotam US ZIP both
   * supply this). Used to render "City, ST ZIP" format in headers.
   */
  postcode?: string;
}

export interface GeocodedLocation {
  lat: number;
  lon: number;
  displayName: string;
  country?: string;
}

// ============================================================================
// Location Lists
// ============================================================================

const US_STATE_ABBREVIATIONS = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
  'DC'
];

const US_STATE_NAMES = [
  'alabama', 'alaska', 'arizona', 'arkansas', 'california', 'colorado',
  'connecticut', 'delaware', 'florida', 'georgia', 'hawaii', 'idaho',
  'illinois', 'indiana', 'iowa', 'kansas', 'kentucky', 'louisiana',
  'maine', 'maryland', 'massachusetts', 'michigan', 'minnesota',
  'mississippi', 'missouri', 'montana', 'nebraska', 'nevada',
  'new hampshire', 'new jersey', 'new mexico', 'new york',
  'north carolina', 'north dakota', 'ohio', 'oklahoma', 'oregon',
  'pennsylvania', 'rhode island', 'south carolina', 'south dakota',
  'tennessee', 'texas', 'utah', 'vermont', 'virginia', 'washington',
  'west virginia', 'wisconsin', 'wyoming', 'district of columbia'
];

const COUNTRY_CODES = [
  'US', 'GB', 'UK', 'CA', 'AU', 'DE', 'FR', 'IT', 'ES', 'JP', 'CN', 'IN',
  'BR', 'RU', 'MX', 'NL', 'BE', 'CH', 'AT', 'SE', 'NO', 'DK', 'FI',
  'IE', 'PT', 'GR', 'TR', 'PL', 'CZ', 'HU', 'RO', 'BG', 'HR', 'SI',
  'SK', 'LT', 'LV', 'EE', 'IS', 'MT', 'CY', 'LU'
];

const COUNTRY_NAMES = [
  'united states', 'united kingdom', 'canada', 'australia', 'germany',
  'france', 'italy', 'spain', 'japan', 'china', 'india', 'brazil',
  'russia', 'mexico', 'netherlands', 'belgium', 'switzerland',
  'austria', 'sweden', 'norway', 'denmark', 'finland', 'ireland',
  'portugal', 'greece', 'turkey', 'poland', 'czech republic',
  'hungary', 'romania', 'bulgaria', 'croatia', 'slovenia', 'slovakia',
  'lithuania', 'latvia', 'estonia', 'iceland', 'malta', 'cyprus',
  'luxembourg'
];

// ============================================================================
// Location Parsing
// ============================================================================

/**
 * Parse location input into structured query
 */
export const parseLocationInput = (input: string): LocationQuery => {
  const cleanInput = normalizeInput(input);

  // Enhanced ZIP code patterns
  const usZipPattern = /^\d{5}(-\d{4})?$/;
  const ukPostcodePattern = /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i;
  const canadaPostalPattern = /^[A-Z]\d[A-Z]\s?\d[A-Z]\d$/i;
  // Must contain at least one digit — letters-only input ("London", "Paris")
  // is a city name, not a postal code. Every supported postal format not
  // already matched above (US/UK/CA) contains a digit.
  const generalPostalPattern = /^(?=[A-Z0-9]*\d)[A-Z0-9]{3,10}$/i;

  // Check for US ZIP code
  if (usZipPattern.test(cleanInput)) {
    return {
      query: cleanInput,
      type: 'zip',
      zipCode: cleanInput,
      country: 'US'
    };
  }

  // Check for UK postcode
  if (ukPostcodePattern.test(cleanInput)) {
    return {
      query: cleanInput,
      type: 'zip',
      zipCode: cleanInput.replace(/\s/g, ''),
      country: 'GB'
    };
  }

  // Check for Canada postal code
  if (canadaPostalPattern.test(cleanInput)) {
    return {
      query: cleanInput,
      type: 'zip',
      zipCode: cleanInput.replace(/\s/g, ''),
      country: 'CA'
    };
  }

  // Check for other international postal codes
  if (generalPostalPattern.test(cleanInput) && cleanInput.length >= 3) {
    return {
      query: cleanInput,
      type: 'zip',
      zipCode: cleanInput
    };
  }

  // Parse comma-separated formats
  if (cleanInput.includes(',')) {
    const parts = cleanInput.split(',').map(part => part.trim()).filter(part => part.length > 0);

    if (parts.length >= 2) {
      const [city, regionOrCountry, ...rest] = parts;
      const cleanCity = city.replace(/[^\w\s\-'.]/g, '').trim();

      if (!cleanCity) {
        return {
          query: cleanInput,
          type: 'city_only',
          city: cleanInput
        };
      }

      const regionOrCountryLower = regionOrCountry.toLowerCase();

      // Check if it's a US state
      const isUSState = US_STATE_ABBREVIATIONS.includes(regionOrCountry.toUpperCase()) ||
                       US_STATE_NAMES.includes(regionOrCountryLower);

      if (isUSState) {
        return {
          query: cleanInput,
          type: 'city_state',
          city: cleanCity,
          state: regionOrCountry,
          country: 'US'
        };
      }

      // Check if it's a known country
      const isCountry = COUNTRY_CODES.includes(regionOrCountry.toUpperCase()) ||
                       COUNTRY_NAMES.includes(regionOrCountryLower);

      if (isCountry) {
        return {
          query: cleanInput,
          type: 'city_country',
          city: cleanCity,
          country: regionOrCountry
        };
      }

      // If we have a third part, assume middle is state/region and last is country
      if (rest.length > 0) {
        return {
          query: cleanInput,
          type: 'city_country',
          city: cleanCity,
          state: regionOrCountry,
          country: rest[0]
        };
      }

      // Default: assume city, country
      return {
        query: cleanInput,
        type: 'city_country',
        city: cleanCity,
        country: regionOrCountry
      };
    }
  }

  // Default: treat as city only
  const cleanCity = cleanInput.replace(/[^\w\s\-'.]/g, '').trim();
  return {
    query: cleanInput,
    type: 'city_only',
    city: cleanCity || cleanInput
  };
};

// ============================================================================
// Error Messages
// ============================================================================

/**
 * Generate helpful error messages based on location type
 */
export const getLocationNotFoundError = (locationQuery: LocationQuery): string => {
  switch (locationQuery.type) {
    case 'zip':
      return 'ZIP/Postal code not found. Please check the code and try again.';
    case 'city_state':
      return 'City/State combination not found. Try "City, State" format (e.g., "New York, NY").';
    case 'city_country':
      return 'City/Country combination not found. Try "City, Country" format (e.g., "London, UK").';
    case 'city_only':
      return 'City not found. Try including state/country (e.g., "Paris, France").';
    default:
      return 'Location not found. Please check the spelling and try again.';
  }
};

// ============================================================================
// Geocoding
// ============================================================================

/**
 * Geocode location query to coordinates
 */
export const geocodeLocation = async (
  locationQuery: LocationQuery
): Promise<GeocodedLocation> => {
  const baseUrl = getApiUrl('/api/weather/geocoding');

  if (locationQuery.type === 'zip') {
    const zipQuery = locationQuery.country
      ? `${locationQuery.zipCode},${locationQuery.country}`
      : locationQuery.zipCode;

    const response = await fetch(
      `${baseUrl}?zip=${encodeURIComponent(zipQuery!)}`,
      { signal: AbortSignal.timeout(10000) }
    );

    if (!response.ok) {
      let errorMessage = 'ZIP code not found. Please check the ZIP code and try again.';
      try {
        const errorData = await response.json();
        if (errorData.error) {
          errorMessage = errorData.error;
        }
      } catch {
        // If response is not JSON, use default error message
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    return {
      lat: data.lat,
      lon: data.lon,
      displayName: `${data.name}, ${data.country}`,
      country: data.country
    };
  } else {
    // Use direct geocoding endpoint
    let query = locationQuery.city || locationQuery.query;

    if (locationQuery.state) {
      query += `,${locationQuery.state}`;
    }
    if (locationQuery.country) {
      query += `,${locationQuery.country}`;
    }

    const response = await fetch(
      `${baseUrl}?q=${encodeURIComponent(query)}&limit=1`,
      { signal: AbortSignal.timeout(10000) }
    );

    if (!response.ok) {
      let errorMessage = `Geocoding API error: ${response.status}`;
      try {
        const errorData = await response.json();
        if (errorData.error) {
          errorMessage = errorData.error;
        }
      } catch {
        // If response is not JSON, use default error message
      }
      throw new Error(errorMessage);
    }

    const data: GeocodingResponse[] = await response.json();

    if (!data || data.length === 0) {
      throw new Error(getLocationNotFoundError(locationQuery));
    }

    const location = data[0];
    const displayName = location.state
      ? `${location.name}, ${location.state}, ${location.country}`
      : `${location.name}, ${location.country}`;

    return {
      lat: location.lat,
      lon: location.lon,
      displayName,
      country: location.country
    };
  }
};

/**
 * Reverse geocode coordinates to location metadata
 */
export const reverseGeocodeLocation = async (
  lat: number,
  lon: number
): Promise<GeocodedLocation> => {
  const baseUrl = getApiUrl('/api/weather/geocoding');
  const response = await fetch(
    `${baseUrl}?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&limit=1`,
    { signal: AbortSignal.timeout(10000) }
  );

  if (!response.ok) {
    let errorMessage = `Reverse geocoding API error: ${response.status}`;
    try {
      const errorData = await response.json();
      if (errorData.error) {
        errorMessage = errorData.error;
      }
    } catch {
      // If response is not JSON, use default error message
    }
    throw new Error(errorMessage);
  }

  const data: GeocodingResponse[] = await response.json();

  if (!data || data.length === 0) {
    throw new Error('Reverse geocoding returned no results.');
  }

  const location = data[0];
  const displayName = location.state
    ? `${location.name}, ${location.state}, ${location.country}`
    : `${location.name}, ${location.country}`;

  return {
    lat: location.lat,
    lon: location.lon,
    displayName,
    country: location.country
  };
};
