/**
 * NOAA planetary K-index loaders for the dashboard APIs and server-rendered pages.
 */

import { fetchSwpcJson } from '@/lib/services/swpc-proxy'
import { logRouteError } from '@/lib/error-utils'
import { parseCurrentKpIndex, parseKpForecast, parseLatestKpEstimate } from '@/lib/services/swpc-kp'
import type { KpSample } from '@/lib/services/swpc-kp'

export const KP_URL = 'https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json'
const KP_ESTIMATE_URL = 'https://services.swpc.noaa.gov/json/planetary_k_index_1m.json'
export const KP_FORECAST_URL =
  'https://services.swpc.noaa.gov/products/noaa-planetary-k-index-forecast.json'

/** Matches the intent pages' own `revalidate`, so the copy and the feed agree. */
const KP_TTL_SECONDS = 300
/** SWPC reissues the three-day outlook far less often than it does Kp. */
const FORECAST_TTL_SECONDS = 900

interface CurrentKpReading extends KpSample {
  isEstimate?: true
}

interface KpObservations {
  current: CurrentKpReading
  recent: KpSample[]
}

/** Prefer the published three-hour series, with a fresh running estimate during publication gaps. */
export async function fetchKpObservations(): Promise<KpObservations> {
  let publishedHistoryPayload: unknown
  try {
    const payload = await fetchSwpcJson(KP_URL, { next: { revalidate: KP_TTL_SECONDS } }, data => {
      const { current, recent } = parseCurrentKpIndex(data)
      // A payload can supply valid history even when it fails the current-reading check.
      if (recent.length > 0) publishedHistoryPayload = data
      return current !== null
    })
    const { current, recent } = parseCurrentKpIndex(payload)
    if (!current) throw new Error('Live Kp unavailable')
    return { current, recent }
  } catch (primaryError) {
    const payload = await fetchSwpcJson(KP_ESTIMATE_URL, {
      next: { revalidate: 60 }, timeoutMs: 2_000, maxRetries: 0,
    }).catch(() => null)
    const current = parseLatestKpEstimate(payload)
    if (!current) throw primaryError
    return {
      current: { ...current, isEstimate: true },
      recent: parseCurrentKpIndex(publishedHistoryPayload).recent,
    }
  }
}

/** Current planetary Kp, or null when neither NOAA product has a usable reading. */
export async function loadCurrentKp(context: string): Promise<CurrentKpReading | null> {
  try {
    return (await fetchKpObservations()).current
  } catch (error) {
    // logRouteError, not console.error: a bare console line never reaches
    // Sentry, so SWPC going down would quietly degrade four indexed pages to
    // "not responding" copy with nothing paging anyone.
    logRouteError(context, error)
    return null
  }
}

export interface KpOutlook {
  expected: number
  maxExpected: number
  /** Three-hour blocks the average covers. */
  blocks: number
  /** The same window in hours, for copy that has to name it. */
  hours: number
}

/** Kp expected over the coming day, or null when the feed carries nothing ahead. */
export async function loadKpOutlook(context: string): Promise<KpOutlook | null> {
  try {
    const payload = await fetchSwpcJson(KP_FORECAST_URL, {
      next: { revalidate: FORECAST_TTL_SECONDS },
    })
    if (!Array.isArray(payload)) return null

    // parseKpForecast owns the window: the eight three-hour blocks from the
    // start of the one in progress. Filtering here as well used to drop that
    // block, so the outlook skipped the most immediate period.
    const forecast = parseKpForecast(payload)
    return forecast ? { ...forecast, hours: forecast.blocks * 3 } : null
  } catch (error) {
    logRouteError(context, error)
    return null
  }
}
