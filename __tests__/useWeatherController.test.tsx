/**
 * Characterization tests for useWeatherController.
 * Pins rate limiting, search-cache keying, stale-response (loadId) guards,
 * and error paths as they behave today. See plan 001.
 *
 * NOTE: Auto-location effect tests (Step 6) are intentionally omitted.
 * The 50ms setTimeout + navigator.permissions + IP-geolocation chain makes
 * fake-timer interleaving too fragile to be a reliable characterization pin.
 * Plan 009 can revisit once the effect is extracted.
 */
import { renderHook, act } from '@testing-library/react'
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

import { useWeatherController } from '@/hooks/useWeatherController'
import { fetchWeatherData } from '@/lib/weather'
import { useLocationContext } from '@/components/location-context'
import { useAuth } from '@/lib/auth'
import { toastService } from '@/lib/toast-service'

const mockFetchWeatherData = fetchWeatherData as jest.MockedFunction<typeof fetchWeatherData>
const mockUseLocationContext = useLocationContext as jest.Mock
const mockUseAuth = useAuth as jest.Mock

/** Build a minimal valid WeatherData object. All required fields are present; optional fields omitted. */
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
    setLocationInput: jest.fn(),
    setCurrentLocation: jest.fn(),
    setShouldClearOnRouteChange: jest.fn(),
  })
  // authLoading: true keeps the auto-location effect dormant (effect returns
  // early at line 389 of the hook while auth is loading), isolating the
  // callback layer for all tests in this file.
  mockUseAuth.mockReturnValue({ profile: null, preferences: null, loading: true })
})

// ---------------------------------------------------------------------------
// Rate limiting
// ---------------------------------------------------------------------------

describe('rate limiting', () => {
  it('denies search when 60 requests have been made in the last hour', async () => {
    localStorage.setItem(
      'weather-app-rate-limit',
      JSON.stringify({
        requests: Array.from({ length: 60 }, () => Date.now()),
        lastReset: Date.now(),
      }),
    )

    const { result } = renderHook(() => useWeatherController())
    await act(async () => {
      await result.current.handleSearch('Boston')
    })

    expect(result.current.error).toMatch(/Too many requests/)
    expect(mockFetchWeatherData).not.toHaveBeenCalled()
    expect(toastService.warning).toHaveBeenCalledTimes(1)
  })

  it('resets the window and allows search when all 60 requests are older than 1 hour', async () => {
    const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000
    localStorage.setItem(
      'weather-app-rate-limit',
      JSON.stringify({
        requests: Array.from({ length: 60 }, () => twoHoursAgo),
        lastReset: twoHoursAgo,
      }),
    )
    mockFetchWeatherData.mockResolvedValueOnce(makeWeather())

    const { result } = renderHook(() => useWeatherController())
    await act(async () => {
      await result.current.handleSearch('Boston')
    })

    expect(result.current.weather).not.toBeNull()
    expect(result.current.error).toBe('')
  })

  it('skips the rate-limit check when bypassRateLimit is true', async () => {
    localStorage.setItem(
      'weather-app-rate-limit',
      JSON.stringify({
        requests: Array.from({ length: 60 }, () => Date.now()),
        lastReset: Date.now(),
      }),
    )
    mockFetchWeatherData.mockResolvedValueOnce(makeWeather())

    const { result } = renderHook(() => useWeatherController())
    await act(async () => {
      await result.current.handleSearch('Boston', false, true)
    })

    expect(mockFetchWeatherData).toHaveBeenCalledTimes(1)
    expect(result.current.weather).not.toBeNull()
  })

  it('decrements remainingSearches by 1 after a successful search', async () => {
    mockFetchWeatherData.mockResolvedValueOnce(makeWeather())

    const { result } = renderHook(() => useWeatherController())
    await act(async () => {
      await result.current.handleSearch('Boston')
    })

    // After one request from a clean store, 59 remain.
    expect(result.current.remainingSearches).toBe(59)
  })
})

// ---------------------------------------------------------------------------
// Input validation and error paths
// ---------------------------------------------------------------------------

describe('handleSearch validation/errors', () => {
  it('rejects empty input with "Please enter a location"', async () => {
    const { result } = renderHook(() => useWeatherController())
    await act(async () => {
      await result.current.handleSearch('')
    })

    expect(result.current.error).toBe('Please enter a location')
    expect(mockFetchWeatherData).not.toHaveBeenCalled()
    expect(toastService.error).toHaveBeenCalledWith('Please enter a location')
  })

  it('rejects input shorter than 3 chars with "Please enter at least 3 characters"', async () => {
    const { result } = renderHook(() => useWeatherController())
    await act(async () => {
      await result.current.handleSearch('ab')
    })

    expect(result.current.error).toBe('Please enter at least 3 characters')
    expect(mockFetchWeatherData).not.toHaveBeenCalled()
  })

  it('sets error "City not found" when fetchWeatherData resolves null', async () => {
    mockFetchWeatherData.mockResolvedValueOnce(null)

    const { result } = renderHook(() => useWeatherController())
    await act(async () => {
      await result.current.handleSearch('Atlantis')
    })

    expect(result.current.error).toBe('City not found')
    expect(result.current.weather).toBeNull()
  })

  it('sets error "Incomplete weather data" when fetchWeatherData resolves with empty forecast', async () => {
    mockFetchWeatherData.mockResolvedValueOnce(makeWeather({ forecast: [] }))

    const { result } = renderHook(() => useWeatherController())
    await act(async () => {
      await result.current.handleSearch('Boston')
    })

    expect(result.current.error).toBe('Incomplete weather data')
    expect(result.current.weather).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Search cache keying
// ---------------------------------------------------------------------------

describe('search cache', () => {
  it('writes an imperial-keyed entry after a successful search with default preferences', async () => {
    mockFetchWeatherData.mockResolvedValueOnce(makeWeather())

    const { result } = renderHook(() => useWeatherController())
    await act(async () => {
      await result.current.handleSearch('Boston')
    })

    const raw = localStorage.getItem('weather-search-cache')
    expect(raw).not.toBeNull()
    const parsed = JSON.parse(raw!)
    expect(Object.keys(parsed)).toContain('boston|imperial')
  })

  it('writes a metric-keyed entry when preferences.temperature_unit is celsius', async () => {
    mockUseAuth.mockReturnValue({
      profile: null,
      preferences: { temperature_unit: 'celsius' },
      loading: true,
    })
    mockFetchWeatherData.mockResolvedValueOnce(makeWeather())

    const { result } = renderHook(() => useWeatherController())
    await act(async () => {
      await result.current.handleSearch('Boston')
    })

    const raw = localStorage.getItem('weather-search-cache')
    expect(raw).not.toBeNull()
    const parsed = JSON.parse(raw!)
    expect(Object.keys(parsed)).toContain('boston|metric')
  })

  it('serves weather from cache and skips fetch when a fresh entry exists', async () => {
    const cached = makeWeather({ location: 'Boston' })
    localStorage.setItem(
      'weather-search-cache',
      JSON.stringify({
        'boston|imperial': { data: cached, timestamp: Date.now() },
      }),
    )

    const { result } = renderHook(() => useWeatherController())
    await act(async () => {
      await result.current.handleSearch('Boston')
    })

    expect(result.current.weather?.location).toBe('Boston')
    expect(mockFetchWeatherData).not.toHaveBeenCalled()
  })

  it('fetches fresh data when the cached entry is older than 5 minutes', async () => {
    const stale = makeWeather({ location: 'Boston' })
    localStorage.setItem(
      'weather-search-cache',
      JSON.stringify({
        'boston|imperial': { data: stale, timestamp: Date.now() - 6 * 60 * 1000 },
      }),
    )
    mockFetchWeatherData.mockResolvedValueOnce(makeWeather({ location: 'Boston Fresh' }))

    const { result } = renderHook(() => useWeatherController())
    await act(async () => {
      await result.current.handleSearch('Boston')
    })

    expect(mockFetchWeatherData).toHaveBeenCalledTimes(1)
  })
})

// ---------------------------------------------------------------------------
// Stale-response (loadId) guard
// ---------------------------------------------------------------------------

describe('stale-response (loadId) guard', () => {
  it('discards a slow stale response that resolves after a newer search', async () => {
    let resolveFirst!: (v: unknown) => void
    let resolveSecond!: (v: unknown) => void

    mockFetchWeatherData
      .mockImplementationOnce(
        () => new Promise((r) => { resolveFirst = r }) as never,
      )
      .mockImplementationOnce(
        () => new Promise((r) => { resolveSecond = r }) as never,
      )

    const { result } = renderHook(() => useWeatherController())

    // Fire both searches without awaiting — they run concurrently.
    act(() => { void result.current.handleSearch('Springfield') })
    act(() => { void result.current.handleSearch('Boston') })

    // Resolve the newer search first.
    await act(async () => {
      resolveSecond(makeWeather({ location: 'Boston' }))
    })

    // Now resolve the older (stale) search — must be discarded.
    await act(async () => {
      resolveFirst(makeWeather({ location: 'Springfield' }))
    })

    expect(result.current.weather?.location).toBe('Boston')
    expect(result.current.loading).toBe(false)
  })

  it('does not clobber a newer success when an older search fails', async () => {
    let rejectFirst!: (e: unknown) => void
    let resolveSecond!: (v: unknown) => void

    mockFetchWeatherData
      .mockImplementationOnce(
        () => new Promise((_, reject) => { rejectFirst = reject }) as never,
      )
      .mockImplementationOnce(
        () => new Promise((r) => { resolveSecond = r }) as never,
      )

    const { result } = renderHook(() => useWeatherController())

    act(() => { void result.current.handleSearch('Springfield') })
    act(() => { void result.current.handleSearch('Boston') })

    // Newer search resolves successfully.
    await act(async () => {
      resolveSecond(makeWeather({ location: 'Boston' }))
    })

    // Older search rejects after the newer one is done — must be ignored.
    await act(async () => {
      rejectFirst(new Error('City not found'))
    })

    // Weather stays as Boston; error stays empty.
    expect(result.current.weather?.location).toBe('Boston')
    expect(result.current.error).toBe('')
  })
})
