/**
 * Home weather bootstrap — thin alias over the shared weather session.
 */
import {
  useWeatherSession,
  type UseWeatherSessionResult,
} from '@/hooks/useWeatherSession'

export function useWeatherController(): UseWeatherSessionResult {
  return useWeatherSession({ mode: 'home' })
}
