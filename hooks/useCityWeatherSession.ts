/**
 * City weather session: shared loader + route seed bootstrap.
 */
import { useEffect } from 'react'
import { useLocationContext } from '@/components/location-context'
import { useWeatherSession } from '@/hooks/useWeatherSession'

export type UseCityWeatherSessionResult = {
  weather: ReturnType<typeof useWeatherSession>['weather']
  loading: boolean
  error: string
  hasSearched: boolean
  remainingSearches: number
  handleSearch: ReturnType<typeof useWeatherSession>['handleSearch']
  handleLocationSearch: ReturnType<typeof useWeatherSession>['handleLocationSearch']
}

export function useCityWeatherSession(seed: string): UseCityWeatherSessionResult {
  const {
    weather,
    loading,
    error,
    hasSearched,
    remainingSearches,
    handleSearch,
    handleLocationSearch,
    loadQuery,
    resetWeatherState,
  } = useWeatherSession({
    enforceRateLimit: false,
    initiallyLoading: true,
  })

  const {
    setLocationInput,
    setCurrentLocation,
    setShouldClearOnRouteChange,
    clearLocationState,
  } = useLocationContext()

  useEffect(() => {
    if (!seed.trim()) return

    clearLocationState()
    setLocationInput(seed)
    setCurrentLocation(seed)
    resetWeatherState()
  }, [
    seed,
    clearLocationState,
    setCurrentLocation,
    setLocationInput,
    resetWeatherState,
  ])

  useEffect(() => {
    if (!seed.trim()) return

    setShouldClearOnRouteChange(false)
    void loadQuery(seed, {
      bypassRateLimit: true,
      toastOnError: false,
      // Keep the route seed in the search bar (e.g. "San Ramon, CA").
      // Overwriting with the API-resolved bare city name dropped state/country
      // and made re-search ambiguous. WeatherDisplay still uses weather.location.
      preferResolvedLocation: false,
    })

    return () => {
      setShouldClearOnRouteChange(true)
    }
  }, [seed, loadQuery, setShouldClearOnRouteChange])

  return {
    weather,
    loading,
    error,
    hasSearched,
    remainingSearches,
    handleSearch,
    handleLocationSearch,
  }
}
