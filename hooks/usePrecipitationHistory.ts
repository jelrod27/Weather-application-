'use client'

import { useRemoteData } from '@/hooks/useRemoteData'

export type PrecipitationSummary = {
  rain24h: number
  snow24h: number
}

type PrecipitationResponse = {
  rain24h: number
  snow24h: number
  dataAvailable: boolean
}

/**
 * Shared 24h precipitation fetch for home and city weather views.
 *
 * Cancellation, staleness and error handling come from useRemoteData — this
 * hook only says what to request and how to read the response.
 */
export function usePrecipitationHistory(
  lat?: number | null,
  lon?: number | null,
): PrecipitationSummary | null {
  const key = lat != null && lon != null ? `${lat},${lon}` : null

  const { data } = useRemoteData<PrecipitationSummary | null>({
    key,
    fetcher: async (signal) => {
      const res = await fetch(
        `/api/weather/precipitation-history?lat=${lat}&lon=${lon}`,
        { signal },
      )
      if (!res.ok) return null

      const body = (await res.json()) as PrecipitationResponse | null
      if (!body?.dataAvailable) return null

      return { rain24h: body.rain24h, snow24h: body.snow24h }
    },
  })

  return data ?? null
}
