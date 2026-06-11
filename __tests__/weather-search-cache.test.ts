/**
 * Unit tests for lib/weather-search-cache.ts
 * Seeds localStorage directly (same technique as the referee suite).
 */

import {
    saveLocationToCache,
    saveWeatherToCache,
    addToSearchCache,
    getFromSearchCache,
    CACHE_KEY,
    WEATHER_KEY,
    CACHE_TIMESTAMP_KEY,
    SEARCH_CACHE_DURATION,
} from '@/lib/weather-search-cache'
import type { WeatherData } from '@/lib/types'

const SEARCH_CACHE_KEY = 'weather-search-cache'

function makeWeatherData(overrides: Partial<WeatherData> = {}): WeatherData {
    return {
        city: 'TestCity',
        temperature: '72°F',
        feelsLike: '70°F',
        humidity: '50%',
        windSpeed: '10 mph',
        description: 'Clear',
        icon: '01d',
        pressure: '1013 hPa',
        sunrise: '6:00 AM',
        sunset: '8:00 PM',
        forecast: [
            {
                day: 'Mon',
                highTemp: 75,
                lowTemp: 60,
                condition: 'clear',
                description: 'Clear sky',
            },
        ],
        ...overrides,
    } as WeatherData
}

beforeEach(() => {
    localStorage.clear()
})

describe('saveLocationToCache / CACHE_KEY', () => {
    it('persists the location string under CACHE_KEY', () => {
        saveLocationToCache('Boston')
        expect(localStorage.getItem(CACHE_KEY)).toBe('Boston')
    })
})

describe('saveWeatherToCache', () => {
    it('strips coordinates before persisting', () => {
        const data = makeWeatherData({ coordinates: { lat: 42.36, lon: -71.06 } })
        saveWeatherToCache(data)

        const raw = JSON.parse(localStorage.getItem(WEATHER_KEY)!)
        expect(raw.coordinates).toBeUndefined()
        expect(raw.city).toBe('TestCity')
    })

    it('writes a timestamp under CACHE_TIMESTAMP_KEY', () => {
        const before = Date.now()
        saveWeatherToCache(makeWeatherData())
        const ts = parseInt(localStorage.getItem(CACHE_TIMESTAMP_KEY)!)
        expect(ts).toBeGreaterThanOrEqual(before)
        expect(ts).toBeLessThanOrEqual(Date.now())
    })
})

describe('addToSearchCache / getFromSearchCache', () => {
    it('round-trips a cached entry with unit-scoped key', () => {
        const data = makeWeatherData()
        addToSearchCache('Boston', data, 'imperial')

        const result = getFromSearchCache('Boston', 'imperial')
        expect(result?.city).toBe('TestCity')
    })

    it('normalises case and trims whitespace in the key', () => {
        const data = makeWeatherData()
        addToSearchCache('  Boston  ', data, 'imperial')
        expect(getFromSearchCache('boston', 'imperial')?.city).toBe('TestCity')
    })

    it('returns null for a different unit system (cache miss)', () => {
        addToSearchCache('Boston', makeWeatherData(), 'imperial')
        expect(getFromSearchCache('Boston', 'metric')).toBeNull()
    })

    it('returns null for an entry past the 5-minute expiry', () => {
        const expiredTs = Date.now() - SEARCH_CACHE_DURATION - 1
        const entry = {
            'boston|imperial': {
                data: makeWeatherData(),
                timestamp: expiredTs,
            },
        }
        localStorage.setItem(SEARCH_CACHE_KEY, JSON.stringify(entry))

        expect(getFromSearchCache('Boston', 'imperial')).toBeNull()
    })

    it('recovers gracefully from corrupted JSON in localStorage', () => {
        localStorage.setItem(SEARCH_CACHE_KEY, 'not-json')
        expect(getFromSearchCache('Boston', 'imperial')).toBeNull()
        // Should not throw
    })
})
