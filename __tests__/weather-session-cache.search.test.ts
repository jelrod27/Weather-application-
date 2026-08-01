/**
 * Search-cache and last-displayed behaviour of lib/weather-session-cache.
 *
 * These assertions used to run through lib/weather-search-cache, an
 * @deprecated shim that delegated here. The shim had no production importers
 * and knip 6.29 flagged its exports as dead, so the tests were repointed at the
 * real module and the shim removed. Coverage is unchanged — the search-cache
 * round-trip, unit-scoped keys, expiry and corrupted-JSON recovery are still
 * only asserted here, not in weather-session-cache.test.ts.
 *
 * Seeds localStorage directly (same technique as the referee suite).
 */

import {
    weatherSessionCache,
    LAST_LOCATION_KEY,
    LAST_WEATHER_KEY,
    LAST_WEATHER_TS_KEY,
    SEARCH_CACHE_DURATION,
} from '@/lib/weather-session-cache'
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

describe('saveLastDisplayed', () => {
    it('persists the location string under LAST_LOCATION_KEY', () => {
        weatherSessionCache.saveLastDisplayed('Boston', makeWeatherData())
        expect(localStorage.getItem(LAST_LOCATION_KEY)).toBe('Boston')
    })

    it('strips coordinates before persisting', () => {
        const data = makeWeatherData({ coordinates: { lat: 42.36, lon: -71.06 } })
        weatherSessionCache.saveLastDisplayed('Boston', data)

        const raw = JSON.parse(localStorage.getItem(LAST_WEATHER_KEY)!)
        expect(raw.coordinates).toBeUndefined()
        expect(raw.city).toBe('TestCity')
    })

    it('writes a timestamp under LAST_WEATHER_TS_KEY', () => {
        const before = Date.now()
        weatherSessionCache.saveLastDisplayed('Boston', makeWeatherData())
        const ts = parseInt(localStorage.getItem(LAST_WEATHER_TS_KEY)!)
        expect(ts).toBeGreaterThanOrEqual(before)
        expect(ts).toBeLessThanOrEqual(Date.now())
    })
})

describe('addSearch / getSearch', () => {
    it('round-trips a cached entry with unit-scoped key', () => {
        const data = makeWeatherData()
        weatherSessionCache.addSearch('Boston', data, 'imperial')

        const result = weatherSessionCache.getSearch('Boston', 'imperial')
        expect(result?.city).toBe('TestCity')
    })

    it('normalises case and trims whitespace in the key', () => {
        const data = makeWeatherData()
        weatherSessionCache.addSearch('  Boston  ', data, 'imperial')
        expect(weatherSessionCache.getSearch('boston', 'imperial')?.city).toBe('TestCity')
    })

    it('returns null for a different unit system (cache miss)', () => {
        weatherSessionCache.addSearch('Boston', makeWeatherData(), 'imperial')
        expect(weatherSessionCache.getSearch('Boston', 'metric')).toBeNull()
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

        expect(weatherSessionCache.getSearch('Boston', 'imperial')).toBeNull()
    })

    it('recovers gracefully from corrupted JSON in localStorage', () => {
        localStorage.setItem(SEARCH_CACHE_KEY, 'not-json')
        expect(weatherSessionCache.getSearch('Boston', 'imperial')).toBeNull()
        // Should not throw
    })
})
