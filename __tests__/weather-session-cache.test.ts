/**
 * Facade tests for lib/weather-session-cache.ts
 */
import {
  weatherSessionCache,
  LAST_LOCATION_KEY,
  LAST_WEATHER_KEY,
  LAST_WEATHER_TS_KEY,
  LAST_DISPLAYED_TTL_MS,
} from '@/lib/weather-session-cache'
import { userCacheService } from '@/lib/user-cache-service'
import type { WeatherData } from '@/lib/types'

jest.mock('@/lib/user-cache-service', () => ({
  userCacheService: {
    cacheWeatherData: jest.fn(),
    getCachedWeatherData: jest.fn(() => null),
  },
}))

function makeWeather(overrides: Partial<WeatherData> = {}): WeatherData {
  return {
    location: 'Boston',
    country: 'US',
    temperature: 60,
    unit: '°F',
    condition: 'Clear',
    description: 'clear sky',
    humidity: 50,
    wind: { speed: 5, direction: 'N' },
    pressure: '1013 hPa',
    sunrise: '06:00',
    sunset: '20:00',
    forecast: [
      {
        day: 'Monday',
        highTemp: 65,
        lowTemp: 50,
        condition: 'Clear',
        description: 'clear',
        details: {},
        hourlyForecast: [],
      },
    ],
    moonPhase: {
      phase: 'Full Moon',
      illumination: 100,
      emoji: '🌕',
      phaseAngle: 180,
      nextFullMoon: '2026-07-11',
      nextMoonset: '07:00',
    },
    uvIndex: 3,
    aqi: 25,
    pollen: { tree: {}, grass: {}, weed: {} },
    ...overrides,
  }
}

beforeEach(() => {
  localStorage.clear()
  jest.clearAllMocks()
})

describe('weatherSessionCache last-displayed', () => {
  it('round-trips fresh last-displayed weather without coordinates', () => {
    weatherSessionCache.saveLastDisplayed(
      'Boston',
      makeWeather({ coordinates: { lat: 42.3, lon: -71.0 } }),
    )

    const raw = JSON.parse(localStorage.getItem(LAST_WEATHER_KEY)!)
    expect(raw.coordinates).toBeUndefined()
    expect(localStorage.getItem(LAST_LOCATION_KEY)).toBe('Boston')
    expect(localStorage.getItem(LAST_WEATHER_TS_KEY)).toBeTruthy()

    const cached = weatherSessionCache.getLastDisplayed()
    expect(cached?.location).toBe('Boston')
    expect(cached?.weather.location).toBe('Boston')
  })

  it('returns null when last-displayed is past TTL', () => {
    weatherSessionCache.saveLastDisplayed('Boston', makeWeather())
    localStorage.setItem(
      LAST_WEATHER_TS_KEY,
      String(Date.now() - LAST_DISPLAYED_TTL_MS - 1000),
    )
    expect(weatherSessionCache.getLastDisplayed()).toBeNull()
  })

  it('clearLastDisplayed removes all three keys', () => {
    weatherSessionCache.saveLastDisplayed('Boston', makeWeather())
    weatherSessionCache.clearLastDisplayed()
    expect(localStorage.getItem(LAST_LOCATION_KEY)).toBeNull()
    expect(localStorage.getItem(LAST_WEATHER_KEY)).toBeNull()
    expect(localStorage.getItem(LAST_WEATHER_TS_KEY)).toBeNull()
  })
})

describe('weatherSessionCache persistAfterFetch', () => {
  it('writes last-displayed, location cache, and search cache', () => {
    const weather = makeWeather()
    weatherSessionCache.persistAfterFetch({
      displayName: 'Boston',
      locationKey: 'boston_imperial',
      weather,
      unitSystem: 'imperial',
      searchTerm: 'Boston',
    })

    expect(weatherSessionCache.getLastDisplayed()?.location).toBe('Boston')
    expect(weatherSessionCache.getSearch('Boston', 'imperial')?.location).toBe('Boston')
    expect(userCacheService.cacheWeatherData).toHaveBeenCalledWith(
      'boston_imperial',
      weather,
    )
  })
})
