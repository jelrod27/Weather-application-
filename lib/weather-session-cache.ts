/**
 * Weather session cache facade.
 *
 * One API over the three persistence surfaces used by weather bootstrap:
 * 1. Last-displayed location/weather (bitweather_city / bitweather_weather_data)
 * 2. Search-keyed short TTL cache (weather-search-cache)
 * 3. Location-keyed weather TTL via userCacheService
 */

import { WEATHER_CACHE_TTL_MS, WEATHER_SEARCH_CACHE_TTL_MS } from '@/lib/cache/weather-cache-policy'
import { safeStorage } from '@/lib/safe-storage'
import type { WeatherData } from '@/lib/types'
import { userCacheService } from '@/lib/user-cache-service'

export const LAST_LOCATION_KEY = 'bitweather_city'
export const LAST_WEATHER_KEY = 'bitweather_weather_data'
export const LAST_WEATHER_TS_KEY = 'bitweather_cache_timestamp'

const SEARCH_CACHE_KEY = 'weather-search-cache'
export const SEARCH_CACHE_DURATION = WEATHER_SEARCH_CACHE_TTL_MS
export const LAST_DISPLAYED_TTL_MS = WEATHER_CACHE_TTL_MS

type SearchCacheEntry = { data: WeatherData; timestamp: number }

function isSearchCacheEntry(value: unknown): value is SearchCacheEntry {
  if (typeof value !== 'object' || value === null) return false
  if (!('data' in value) || !('timestamp' in value)) return false
  return typeof (value as SearchCacheEntry).timestamp === 'number'
}

function stripCoordinates(weatherData: WeatherData): WeatherData {
  const { coordinates: _coordinates, ...rest } = weatherData
  return rest
}

function readSearchCache(): Map<string, SearchCacheEntry> {
  try {
    const cached = safeStorage.getItem(SEARCH_CACHE_KEY)
    if (!cached) return new Map()

    const parsed = JSON.parse(cached) as Record<string, unknown>
    const map = new Map<string, SearchCacheEntry>()
    const now = Date.now()

    for (const [key, value] of Object.entries(parsed)) {
      if (!isSearchCacheEntry(value)) continue
      if (now - value.timestamp < SEARCH_CACHE_DURATION) {
        map.set(key, value)
      }
    }
    return map
  } catch (error) {
    console.warn('[weather-session-cache] Failed to read search cache:', error)
    return new Map()
  }
}

function writeSearchCache(cache: Map<string, SearchCacheEntry>): void {
  try {
    safeStorage.setItem(SEARCH_CACHE_KEY, JSON.stringify(Object.fromEntries(cache)))
  } catch (error) {
    console.warn('[weather-session-cache] Failed to write search cache:', error)
  }
}

function searchKey(searchTerm: string, unitSystem: string): string {
  return `${searchTerm.toLowerCase().trim()}|${unitSystem}`
}

export const weatherSessionCache = {
  saveLastDisplayed(location: string, weatherData: WeatherData): void {
    try {
      safeStorage.setItem(LAST_LOCATION_KEY, location)
      safeStorage.setItem(LAST_WEATHER_KEY, JSON.stringify(stripCoordinates(weatherData)))
      safeStorage.setItem(LAST_WEATHER_TS_KEY, Date.now().toString())
    } catch (error) {
      console.warn('[weather-session-cache] Failed to save last displayed:', error)
    }
  },

  getLastDisplayed(): { location: string; weather: WeatherData } | null {
    try {
      const location = safeStorage.getItem(LAST_LOCATION_KEY)
      const weatherRaw = safeStorage.getItem(LAST_WEATHER_KEY)
      const timestampRaw = safeStorage.getItem(LAST_WEATHER_TS_KEY)
      if (!location || !weatherRaw || !timestampRaw) return null

      const age = Date.now() - parseInt(timestampRaw, 10)
      if (!Number.isFinite(age) || age >= LAST_DISPLAYED_TTL_MS) return null

      const weather = JSON.parse(weatherRaw) as WeatherData
      if (!weather?.forecast?.length) return null
      return { location, weather }
    } catch (error) {
      console.warn('[weather-session-cache] Failed to read last displayed:', error)
      return null
    }
  },

  clearLastDisplayed(): void {
    try {
      safeStorage.removeItem(LAST_LOCATION_KEY)
      safeStorage.removeItem(LAST_WEATHER_KEY)
      safeStorage.removeItem(LAST_WEATHER_TS_KEY)
    } catch (error) {
      console.warn('[weather-session-cache] Failed to clear last displayed:', error)
    }
  },

  addSearch(searchTerm: string, weatherData: WeatherData, unitSystem: string): void {
    const cache = readSearchCache()
    cache.set(searchKey(searchTerm, unitSystem), {
      data: weatherData,
      timestamp: Date.now(),
    })
    writeSearchCache(cache)
  },

  getSearch(searchTerm: string, unitSystem: string): WeatherData | null {
    const cached = readSearchCache().get(searchKey(searchTerm, unitSystem))
    if (cached && Date.now() - cached.timestamp < SEARCH_CACHE_DURATION) {
      return cached.data
    }
    return null
  },

  cacheByLocation(locationKey: string, weatherData: WeatherData): void {
    userCacheService.cacheWeatherData(locationKey, weatherData)
  },

  getByLocation(locationKey: string): WeatherData | null {
    return userCacheService.getCachedWeatherData(locationKey)
  },

  /**
   * Single write path after a successful weather fetch.
   * Updates last-displayed, optional search cache, and location-keyed TTL cache.
   */
  persistAfterFetch(options: {
    displayName: string
    locationKey: string
    weather: WeatherData
    unitSystem: string
    searchTerm?: string
  }): void {
    const { displayName, locationKey, weather, unitSystem, searchTerm } = options
    this.saveLastDisplayed(displayName, weather)
    this.cacheByLocation(locationKey, weather)
    if (searchTerm?.trim()) {
      this.addSearch(searchTerm, weather, unitSystem)
    }
  },
}
