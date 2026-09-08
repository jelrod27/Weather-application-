/**
 * GOES X-ray flux: flare classification and the current-reading loader used by
 * the solar flare intent page.
 *
 * The classification thresholds mirror `app/api/space-weather/xray-flux`, but
 * live here so a server component can read them without calling the site's own
 * API route over HTTP.
 */

import { fetchSwpcJson } from '@/lib/services/swpc-proxy'

export const GOES_XRAY_URL =
  'https://services.swpc.noaa.gov/json/goes/primary/xrays-1-day.json'

/** The long-band channel SWPC classifies flares on. */
const LONG_BAND = '0.1-0.8nm'

export type FlareClass = 'A' | 'B' | 'C' | 'M' | 'X'

export interface FlareReading {
  /** Peak flux in W/m². */
  flux: number
  /** Letter class alone, e.g. "M". */
  flareClass: FlareClass
  /** Letter and magnitude, e.g. "M2.4". */
  label: string
  /** SWPC time tag for the sample. */
  timeTag: string
}

/**
 * Letter class and magnitude for a long-band flux reading. The scale is
 * logarithmic: each letter is ten times the previous, and the number is the
 * multiplier within that decade, so X2 is twice X1 and twenty times M1.
 */
export function classifyXrayFlux(flux: number): { flareClass: FlareClass; label: string } {
  const decades: Array<{ threshold: number; flareClass: FlareClass }> = [
    { threshold: 1e-4, flareClass: 'X' },
    { threshold: 1e-5, flareClass: 'M' },
    { threshold: 1e-6, flareClass: 'C' },
    { threshold: 1e-7, flareClass: 'B' },
  ]

  for (const { threshold, flareClass } of decades) {
    if (flux >= threshold) {
      return { flareClass, label: `${flareClass}${(flux / threshold).toFixed(1)}` }
    }
  }
  return { flareClass: 'A', label: `A${(flux / 1e-8).toFixed(1)}` }
}

interface XrayRow {
  time_tag?: unknown
  energy?: unknown
  flux?: unknown
}

/**
 * The most recent long-band sample in a GOES X-ray payload, or null when the
 * feed carries nothing usable. Returns null rather than a fabricated quiet
 * reading, so a caller can say "unavailable" instead of "A0.0".
 */
export function parseLatestXrayFlux(payload: unknown): FlareReading | null {
  if (!Array.isArray(payload)) return null

  let latest: FlareReading | null = null
  for (const entry of payload as XrayRow[]) {
    if (!entry || typeof entry !== 'object') continue
    if (entry.energy !== LONG_BAND) continue

    const flux = typeof entry.flux === 'number' ? entry.flux : Number(entry.flux)
    const timeTag = typeof entry.time_tag === 'string' ? entry.time_tag : ''
    if (!Number.isFinite(flux) || flux <= 0 || !timeTag) continue

    if (!latest || timeTag > latest.timeTag) {
      const { flareClass, label } = classifyXrayFlux(flux)
      latest = { flux, flareClass, label, timeTag }
    }
  }
  return latest
}

/** Current long-band reading, or null when SWPC is unreachable. */
export async function loadCurrentFlare(): Promise<FlareReading | null> {
  try {
    const payload = await fetchSwpcJson(GOES_XRAY_URL, { next: { revalidate: 300 } })
    return parseLatestXrayFlux(payload)
  } catch (error) {
    console.error('[space-weather/solar-flares]', error)
    return null
  }
}
