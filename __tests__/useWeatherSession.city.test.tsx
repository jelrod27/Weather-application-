/**
 * City-mode characterization for useCityWeatherSession.
 * Pins seed load, cache-hit persist after clear, and route-clear flags.
 */
import { renderHook, waitFor } from '@testing-library/react'
import type { WeatherData } from '@/lib/types'

jest.mock('@/lib/weather', () => ({
  fetchWeatherData: jest.fn(),
  fetchWeatherByLocation: jest.fn(),
}))
jest.mock('@/lib/location-service', () => ({
  locationService: {
    getCurrentLocation: jest.fn(),
    getLocationByIP: jest.fn(),
    isGeolocationSupported: jest.fn(() => true),
  },
}))
jest.mock('@/lib/user-cache-service', () => ({
  userCacheService: {
    getPreferences: jest.fn(() => null),
    getLastLocation: jest.fn(() => null),
    saveLastLocation: jest.fn(),
    getLocationKey: jest.fn((loc: { displayName?: string }) => loc?.displayName ?? 'key'),
    getCachedWeatherData: jest.fn(() => null),
    cacheWeatherData: jest.fn(),
    getUnitSystem: jest.fn(() => 'imperial'),
    getAutoLocationEnabled: jest.fn(() => true),
    mirrorServerPreferences: jest.fn(() => true),
    resetMirroredSettings: jest.fn(() => true),
  },
}))
jest.mock('@/lib/toast-service', () => ({
  toastService: { error: jest.fn(), warning: jest.fn(), success: jest.fn() },
}))
jest.mock('@/components/location-context', () => ({
  useLocationContext: jest.fn(),
}))
jest.mock('@/lib/auth', () => ({
  useAuth: jest.fn(),
}))

import { useCityWeatherSession } from '@/hooks/useCityWeatherSession'
import { fetchWeatherData } from '@/lib/weather'
import { useLocationContext } from '@/components/location-context'
import { useAuth } from '@/lib/auth'
import { weatherSessionCache } from '@/lib/weather-session-cache'

const mockFetchWeatherData = fetchWeatherData as jest.MockedFunction<typeof fetchWeatherData>
const mockUseLocationContext = useLocationContext as jest.Mock
const mockUseAuth = useAuth as jest.Mock

const clearLocationState = jest.fn()
const setLocationInput = jest.fn()
const setCurrentLocation = jest.fn()
const setShouldClearOnRouteChange = jest.fn()

const makeWeather = (overrides: Record<string, unknown> = {}): WeatherData => ({
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
})

beforeEach(() => {
  jest.clearAllMocks()
  localStorage.clear()
  mockUseLocationContext.mockReturnValue({
    locationInput: '',
    currentLocation: '',
    setLocationInput,
    setCurrentLocation,
    setShouldClearOnRouteChange,
    clearLocationState,
  })
  mockUseAuth.mockReturnValue({ profile: null, preferences: null, loading: false })
})

describe('useCityWeatherSession', () => {
  it('loads seed weather and disables route-clear while mounted', async () => {
    mockFetchWeatherData.mockResolvedValueOnce(makeWeather())

    const { result, unmount } = renderHook(() => useCityWeatherSession('Boston, MA'))

    await waitFor(() => {
      expect(result.current.weather?.location).toBe('Boston')
      expect(result.current.loading).toBe(false)
    })

    expect(clearLocationState).toHaveBeenCalled()
    expect(setShouldClearOnRouteChange).toHaveBeenCalledWith(false)
    expect(mockFetchWeatherData).toHaveBeenCalledWith('Boston, MA', 'imperial')
    expect(weatherSessionCache.getLastDisplayed()?.location).toBe('Boston')

    unmount()
    expect(setShouldClearOnRouteChange).toHaveBeenCalledWith(true)
  })

  it('serves search-cache hits and rewrites last-displayed after clear', async () => {
    const cached = makeWeather({ location: 'Boston' })
    localStorage.setItem(
      'weather-search-cache',
      JSON.stringify({
        'boston, ma|imperial': { data: cached, timestamp: Date.now() },
      }),
    )

    const { result } = renderHook(() => useCityWeatherSession('Boston, MA'))

    await waitFor(() => {
      expect(result.current.weather?.location).toBe('Boston')
      expect(result.current.loading).toBe(false)
    })

    expect(mockFetchWeatherData).not.toHaveBeenCalled()
    expect(weatherSessionCache.getLastDisplayed()?.location).toBe('Boston')
  })

  it('sets error when seed fetch fails', async () => {
    mockFetchWeatherData.mockRejectedValueOnce(new Error('City not found'))

    const { result } = renderHook(() => useCityWeatherSession('Atlantis'))

    await waitFor(() => {
      expect(result.current.error).toBe('City not found')
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.weather).toBeNull()
  })
})
