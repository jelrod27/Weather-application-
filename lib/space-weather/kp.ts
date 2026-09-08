/**
 * Server-side loaders for the NOAA planetary K-index, shared by the hub and
 * the Kp and aurora intent pages.
 *
 * These lived as three near-identical copies inside the page files — same URL,
 * same TTL, same catch — which is how one of them ends up with a different
 * revalidate or a fixed bug the others never get. `loadCurrentFlare` in
 * ./xray.ts already sat beside its parser; these now match.
 */

import { fetchSwpcJson } from '@/lib/services/swpc-proxy'
import { logRouteError } from '@/lib/error-utils'
import { parseKpForecast, parsePlanetaryKpIndex, type KpSample } from '@/lib/services/swpc-kp'

export const KP_URL = 'https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json'
export const KP_FORECAST_URL =
  'https://services.swpc.noaa.gov/products/noaa-planetary-k-index-forecast.json'

/** Matches the intent pages' own `revalidate`, so the copy and the feed agree. */
const KP_TTL_SECONDS = 300
/** SWPC reissues the three-day outlook far less often than it does Kp. */
const FORECAST_TTL_SECONDS = 900

/** Current planetary Kp, or null when SWPC is unreachable. */
export async function loadCurrentKp(context: string): Promise<KpSample | null> {
  try {
    const payload = await fetchSwpcJson(KP_URL, { next: { revalidate: KP_TTL_SECONDS } })
    return parsePlanetaryKpIndex(payload).current
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
