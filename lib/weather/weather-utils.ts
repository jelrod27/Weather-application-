/**
 * Weather Utilities Module
 *
 * Contains helper functions for:
 * - Temperature conversions and formatting
 * - Wind direction calculations
 * - Time formatting with timezone support
 * - Pressure formatting by region
 * - Moon phase calculations
 * - Weather condition mapping
 */

// ============================================================================
// Types
// ============================================================================



// ============================================================================
// API URL Helper
// ============================================================================

/**
 * Helper function to get proper API URL for server-side/client-side rendering
 * Handles the difference between build-time static generation and client-side fetching
 */
export const getApiUrl = (path: string): string => {
  if (typeof window === 'undefined') {
    // Server-side/build time
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.NEXT_PUBLIC_VERCEL_URL
      ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
      : process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    return `${baseUrl}${path}`;
  }
  // Client-side
  return path;
};

// ============================================================================
// Unit System Detection
// ============================================================================

/**
 * Determine if country should use metric units
 */
export const shouldUseMetricUnits = (countryCode: string): boolean => {
  // Countries that primarily use imperial units
  const imperialCountries = ['US', 'LR', 'MM']; // US, Liberia, Myanmar
  return !imperialCountries.includes(countryCode);
};

/**
 * Location-based unit detection
 */
export const isUSALocation = (country: string): boolean =>
  country === 'US' || country === 'USA';

export const shouldUseFahrenheit = (countryCode: string): boolean =>
  isUSALocation(countryCode);

/**
 * Determine if country should use inches of mercury for pressure
 */
export const shouldUseInchesOfMercury = (countryCode: string): boolean => {
  const inHgCountries = ['US', 'CA', 'PR', 'VI', 'GU', 'AS', 'MP'];
  return inHgCountries.includes(countryCode);
};

// ============================================================================
// Temperature Functions
// ============================================================================

export const celsiusToFahrenheit = (celsius: number): number =>
  Math.round((celsius * 9/5) + 32);

export const fahrenheitToCelsius = (fahrenheit: number): number =>
  Math.round((fahrenheit - 32) * 5/9);

/**
 * Enhanced temperature formatting with proper unit handling
 */
export const formatTemperature = (
  temp: number,
  countryCode: string,
  unitSystem?: 'metric' | 'imperial'
): {
  value: number;
  unit: string;
  display: string
} => {
  const resolvedUnitSystem = unitSystem ?? (shouldUseFahrenheit(countryCode) ? 'imperial' : 'metric');

  if (resolvedUnitSystem === 'imperial') {
    return {
      value: temp,
      unit: '°F',
      display: `${Math.round(temp)}°F`
    };
  }

  const tempC = unitSystem ? Math.round(temp) : fahrenheitToCelsius(temp);
  return {
    value: tempC,
    unit: '°C',
    display: `${tempC}°C`
  };
};

/**
 * Calculate dew point from temperature and humidity using Magnus formula
 */
export const calculateDewPoint = (tempF: number, humidity: number): number => {
  const tempC = (tempF - 32) * 5/9;
  const a = 17.27;
  const b = 237.7;
  const alpha = ((a * tempC) / (b + tempC)) + Math.log(humidity / 100);
  const dewPointC = (b * alpha) / (a - alpha);
  const dewPointF = (dewPointC * 9/5) + 32;
  return Math.round(dewPointF);
};

// ============================================================================
// Wind Functions
// ============================================================================

/**
 * Convert wind degrees to 8-point compass direction
 */
export const getCompassDirection = (degrees: number): string => {
  if (degrees < 0 || degrees > 360) {
    return 'N';
  }

  const normalizedDegrees = ((degrees % 360) + 360) % 360;

  if (normalizedDegrees >= 337.5 || normalizedDegrees < 22.5) return 'N';
  if (normalizedDegrees >= 22.5 && normalizedDegrees < 67.5) return 'NE';
  if (normalizedDegrees >= 67.5 && normalizedDegrees < 112.5) return 'E';
  if (normalizedDegrees >= 112.5 && normalizedDegrees < 157.5) return 'SE';
  if (normalizedDegrees >= 157.5 && normalizedDegrees < 202.5) return 'S';
  if (normalizedDegrees >= 202.5 && normalizedDegrees < 247.5) return 'SW';
  if (normalizedDegrees >= 247.5 && normalizedDegrees < 292.5) return 'W';
  if (normalizedDegrees >= 292.5 && normalizedDegrees < 337.5) return 'NW';

  return 'N';
};

/**
 * Convert wind degrees to 16-point direction
 */
export const getWindDirection = (degrees: number): string => {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
                      'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  // Normalize degrees to 0-360 range to handle negative values
  const normalizedDegrees = ((degrees % 360) + 360) % 360;
  const index = Math.round(normalizedDegrees / 22.5) % 16;
  return directions[index];
};

/**
 * Enhanced wind display formatting with proper unit handling
 */

// ============================================================================
// Time Functions
// ============================================================================

/**
 * Format Unix timestamp to readable time with timezone offset
 */
export const formatTime = (timestamp: number, timezoneOffset?: number): string => {
  const utcTime = timestamp * 1000;
  const localTime = timezoneOffset ? utcTime + (timezoneOffset * 1000) : utcTime;

  const date = new Date(localTime);
  const hours = date.getUTCHours();
  const minutes = date.getUTCMinutes();

  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  const ampm = hours >= 12 ? 'pm' : 'am';
  const paddedMinutes = minutes.toString().padStart(2, '0');

  return `${displayHours}:${paddedMinutes} ${ampm}`;
};

// ============================================================================
// Pressure Functions
// ============================================================================



/**
 * Enhanced pressure formatting with regional support
 */
export const formatPressureByRegion = (
  pressureHPa: number,
  countryCode: string,
  userPreference?: 'hPa' | 'inHg'
): string => {
  const useInchesOfMercury = userPreference === 'inHg' ||
    (userPreference === undefined && shouldUseInchesOfMercury(countryCode));

  if (useInchesOfMercury) {
    const pressureInHg = pressureHPa * 0.02953;
    return `${pressureInHg.toFixed(2)} in`;
  } else {
    return `${Math.round(pressureHPa)} hPa`;
  }
};

// ============================================================================
// UV Index Functions
// ============================================================================

export const getUVDescription = (uvIndex: number): string => {
  if (uvIndex <= 2) return 'Low';
  if (uvIndex <= 5) return 'Moderate';
  if (uvIndex <= 7) return 'High';
  if (uvIndex <= 10) return 'Very High';
  return 'Extreme';
};

/**
 * Estimate current UV from daily maximum based on time of day
 */

// ============================================================================
// Weather Condition Mapping
// ============================================================================

/**
 * Map free-text weather conditions to custom condition names
 */
export const mapWeatherCondition = (condition: string): string => {
  const conditionLower = condition.toLowerCase();

  if (conditionLower.includes('clear') || conditionLower.includes('sun')) return 'sunny';
  if (conditionLower.includes('cloud')) return 'cloudy';
  if (conditionLower.includes('rain') || conditionLower.includes('drizzle')) return 'rainy';
  if (conditionLower.includes('snow') || conditionLower.includes('sleet')) return 'snowy';
  if (conditionLower.includes('mist') || conditionLower.includes('fog')) return 'cloudy';
  if (conditionLower.includes('thunder')) return 'rainy';

  return 'sunny';
};

// ============================================================================
// Input Normalization
// ============================================================================

/**
 * Normalize input by trimming whitespace and handling special characters
 */
export const normalizeInput = (input: string): string => {
  return input
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[""'']/g, '"')
    .replace(/[–—]/g, '-');
};
