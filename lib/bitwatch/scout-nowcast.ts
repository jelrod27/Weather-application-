import { fetchWithTimeout } from '@/lib/fetch-with-timeout'

/**
 * Optional Open-Meteo minutely precipitation at the pin. Scout still fires
 * from motion alone if this fetch fails.
 */
export async function pinNowcastIsWet(lat: number, lon: number): Promise<boolean> {
  const url = new URL('https://api.open-meteo.com/v1/forecast')
  url.searchParams.set('latitude', String(lat))
  url.searchParams.set('longitude', String(lon))
  url.searchParams.set('minutely_15', 'precipitation')
  url.searchParams.set('forecast_minutely_15', '8')
  url.searchParams.set('precipitation_unit', 'mm')

  try {
    const res = await fetchWithTimeout(url.toString(), { timeoutMs: 4000 })
    if (!res.ok) return false
    const data = (await res.json()) as { minutely_15?: { precipitation?: Array<number | null> } }
    const values = data.minutely_15?.precipitation ?? []
    return values.slice(0, 4).some((mm) => typeof mm === 'number' && mm >= 0.5)
  } catch (error) {
    console.error('[bitwatch-scout] nowcast failed', error)
    return false
  }
}
