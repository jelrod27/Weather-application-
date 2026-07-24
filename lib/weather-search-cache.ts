/**
 * @deprecated Import from `@/lib/weather-session-cache` instead.
 * Kept as a thin re-export so existing tests and call sites keep working.
 */

export {
  CACHE_KEY,
  WEATHER_KEY,
  CACHE_TIMESTAMP_KEY,
  SEARCH_CACHE_DURATION,
  saveLocationToCache,
  saveWeatherToCache,
  addToSearchCache,
  getFromSearchCache,
  weatherSessionCache,
  LAST_LOCATION_KEY,
  LAST_WEATHER_KEY,
  LAST_WEATHER_TS_KEY,
  LAST_DISPLAYED_TTL_MS,
} from '@/lib/weather-session-cache'
