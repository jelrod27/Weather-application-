/**
 * @deprecated Import from `@/lib/weather-session-cache` instead.
 * Compatibility surface for older tests and call sites.
 */

import {
  LAST_LOCATION_KEY,
  LAST_WEATHER_KEY,
  LAST_WEATHER_TS_KEY,
  weatherSessionCache,
} from '@/lib/weather-session-cache'
import { safeStorage } from '@/lib/safe-storage'
import type { WeatherData } from '@/lib/types'

export {
  LAST_LOCATION_KEY,
  LAST_WEATHER_KEY,
  LAST_WEATHER_TS_KEY,
  SEARCH_CACHE_DURATION,
  LAST_DISPLAYED_TTL_MS,
  weatherSessionCache,
} from '@/lib/weather-session-cache'

/** @deprecated Use LAST_LOCATION_KEY */
export const CACHE_KEY = LAST_LOCATION_KEY
/** @deprecated Use LAST_WEATHER_KEY */
export const WEATHER_KEY = LAST_WEATHER_KEY
/** @deprecated Use LAST_WEATHER_TS_KEY */
export const CACHE_TIMESTAMP_KEY = LAST_WEATHER_TS_KEY

/** @deprecated Prefer weatherSessionCache.saveLastDisplayed / persistAfterFetch */
export function saveLocationToCache(location: string): void {
  try {
    safeStorage.setItem(LAST_LOCATION_KEY, location)
  } catch (error) {
    console.warn('Failed to save location to cache:', error)
  }
}

/** @deprecated Prefer weatherSessionCache.saveLastDisplayed / persistAfterFetch */
export function saveWeatherToCache(weatherData: WeatherData): void {
  try {
    const { coordinates: _coordinates, ...rest } = weatherData
    safeStorage.setItem(LAST_WEATHER_KEY, JSON.stringify(rest))
    safeStorage.setItem(LAST_WEATHER_TS_KEY, Date.now().toString())
  } catch (error) {
    console.warn('Failed to save weather data to cache:', error)
  }
}

/** @deprecated Prefer weatherSessionCache.addSearch */
export function addToSearchCache(
  searchTerm: string,
  weatherData: WeatherData,
  unitSystem: string,
): void {
  weatherSessionCache.addSearch(searchTerm, weatherData, unitSystem)
}

/** @deprecated Prefer weatherSessionCache.getSearch */
export function getFromSearchCache(
  searchTerm: string,
  unitSystem: string,
): WeatherData | null {
  return weatherSessionCache.getSearch(searchTerm, unitSystem)
}
