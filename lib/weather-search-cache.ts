import { safeStorage } from '@/lib/safe-storage'
import type { WeatherData } from '@/lib/types'

// Exported so the hook's cache-restore effect can read them directly from
// localStorage without re-declaring the same key strings.
export const CACHE_KEY = 'bitweather_city'
export const WEATHER_KEY = 'bitweather_weather_data'
export const CACHE_TIMESTAMP_KEY = 'bitweather_cache_timestamp'

const SEARCH_CACHE_KEY = 'weather-search-cache'
export const SEARCH_CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export function saveLocationToCache(location: string): void {
    try {
        safeStorage.setItem(CACHE_KEY, location)
    } catch (error) {
        console.warn('Failed to save location to cache:', error)
    }
}

export function saveWeatherToCache(weatherData: WeatherData): void {
    try {
        // Do not persist precise coordinates (lat/lon) in localStorage.
        // WeatherData includes optional coordinates; strip them before caching.
        const { coordinates, ...rest } = weatherData as any
        safeStorage.setItem(WEATHER_KEY, JSON.stringify(rest))
        safeStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString())
    } catch (error) {
        console.warn('Failed to save weather data to cache:', error)
    }
}

function getSearchCache(): Map<string, { data: WeatherData; timestamp: number }> {
    try {
        const cached = safeStorage.getItem(SEARCH_CACHE_KEY)
        if (cached) {
            const parsed = JSON.parse(cached)
            const map = new Map<string, { data: WeatherData; timestamp: number }>()
            const now = Date.now()
            for (const [key, value] of Object.entries(parsed)) {
                if (typeof value === 'object' && value !== null && 'data' in value && 'timestamp' in value) {
                    const cacheEntry = value as { data: WeatherData; timestamp: number }
                    if (now - cacheEntry.timestamp < SEARCH_CACHE_DURATION) {
                        map.set(key, cacheEntry)
                    }
                }
            }
            return map
        }
    } catch (error) {
        console.warn('Failed to get search cache:', error)
    }
    return new Map()
}

function saveSearchCache(cache: Map<string, { data: WeatherData; timestamp: number }>): void {
    try {
        const obj = Object.fromEntries(cache)
        safeStorage.setItem(SEARCH_CACHE_KEY, JSON.stringify(obj))
    } catch (error) {
        console.warn('Failed to save search cache:', error)
    }
}

// Cache keys include the unit system: the cached WeatherData is
// unit-baked, so a C/F toggle (or a Supabase preference arriving after
// first fetch) must miss rather than serve wrong-unit payloads.
export function addToSearchCache(searchTerm: string, weatherData: WeatherData, unitSystem: string): void {
    const cache = getSearchCache()
    cache.set(`${searchTerm.toLowerCase().trim()}|${unitSystem}`, {
        data: weatherData,
        timestamp: Date.now()
    })
    saveSearchCache(cache)
}

export function getFromSearchCache(searchTerm: string, unitSystem: string): WeatherData | null {
    const cache = getSearchCache()
    const cached = cache.get(`${searchTerm.toLowerCase().trim()}|${unitSystem}`)
    if (cached && Date.now() - cached.timestamp < SEARCH_CACHE_DURATION) {
        return cached.data
    }
    return null
}
