export type RadarFeatureCollection = {
  type: 'FeatureCollection'
  features: Array<{
    type?: string
    geometry?: unknown
    properties?: Record<string, unknown>
  }>
}

export interface RadarStormReport {
  category: 'tornado' | 'hail' | 'wind'
  time: string
  size: string
  location: string
  state: string
  lat: number | null
  lon: number | null
  comments: string
  date: string
}

export interface RadarOverlaySnapshot {
  alerts?: RadarFeatureCollection
  spc?: RadarFeatureCollection
  stormReports?: RadarStormReport[]
}

function isAbortError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'name' in error && error.name === 'AbortError'
}

async function fetchOptionalJson<T>(
  url: string,
  signal: AbortSignal,
  fetchImpl: typeof fetch,
): Promise<T | undefined> {
  try {
    const response = await fetchImpl(url, { signal })
    if (!response.ok) return undefined
    return (await response.json()) as T
  } catch (error) {
    if (isAbortError(error)) throw error
    return undefined
  }
}

export async function fetchRadarOverlaySnapshot(
  latitude: number,
  longitude: number,
  signal: AbortSignal,
  fetchImpl: typeof fetch = fetch,
): Promise<RadarOverlaySnapshot> {
  const point = encodeURIComponent(`${latitude},${longitude}`)
  const [alerts, spc, reportsPayload] = await Promise.all([
    fetchOptionalJson<RadarFeatureCollection>(
      `/api/weather/alerts?geojson=1&point=${point}`,
      signal,
      fetchImpl,
    ),
    fetchOptionalJson<RadarFeatureCollection>(
      '/api/weather/spc-outlook?day=1&type=cat',
      signal,
      fetchImpl,
    ),
    fetchOptionalJson<{ reports?: RadarStormReport[] }>(
      '/api/weather/storm-reports?days=2',
      signal,
      fetchImpl,
    ),
  ])

  return {
    alerts,
    spc,
    stormReports: reportsPayload?.reports,
  }
}
