import { useEffect, useState } from 'react'

export type PrecipitationSummary = {
  rain24h: number
  snow24h: number
}

/**
 * Shared 24h precipitation fetch for home and city weather views.
 * Aborts in-flight requests when coordinates change or the component unmounts.
 */
export function usePrecipitationHistory(
  lat?: number | null,
  lon?: number | null,
): PrecipitationSummary | null {
  const [precipitation, setPrecipitation] = useState<PrecipitationSummary | null>(null)

  useEffect(() => {
    if (lat == null || lon == null) {
      setPrecipitation(null)
      return
    }

    setPrecipitation(null)
    const controller = new AbortController()

    fetch(`/api/weather/precipitation-history?lat=${lat}&lon=${lon}`, {
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (controller.signal.aborted) return
        if (!data?.dataAvailable) {
          setPrecipitation(null)
          return
        }
        setPrecipitation({ rain24h: data.rain24h, snow24h: data.snow24h })
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === 'AbortError') return
        setPrecipitation(null)
      })

    return () => controller.abort()
  }, [lat, lon])

  return precipitation
}
