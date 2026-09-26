'use client';

import { useAuth } from '@/lib/auth';
import { resolveUnitSystem } from '@/lib/preferences/resolve';
import { userCacheService } from '@/lib/user-cache-service';
import { celsiusToFahrenheit } from '@/lib/weather/weather-utils';

interface StargazerUnits {
  temperature: (celsius: number | null) => string;
  wind: (kmh: number | null) => string;
}

/** Use the same saved preferences as weather; provider readings are always metric. */
export function useStargazerUnits(): StargazerUnits {
  const { preferences } = useAuth();
  const metric = resolveUnitSystem(preferences, userCacheService.getUnitSystem()) === 'metric';
  const windUnit = preferences?.wind_unit ?? (metric ? 'kmh' : 'mph');
  return {
    temperature: value => value == null || !Number.isFinite(value) ? 'Unavailable' : `${metric ? Math.round(value) : celsiusToFahrenheit(value)}${metric ? '°C' : '°F'}`,
    wind: value => {
      if (value == null || !Number.isFinite(value)) return 'Unavailable';
      const converted = windUnit === 'ms' ? value / 3.6 : windUnit === 'mph' ? value * 0.621371 : value;
      return `${Math.round(converted)} ${windUnit === 'ms' ? 'm/s' : windUnit === 'kmh' ? 'km/h' : 'mph'}`;
    },
  };
}
