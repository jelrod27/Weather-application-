/** Parsed hazard fields from NWS CAP `parameters` plus description fallbacks. */

export type NwsHazardParameters = {
  maxHail: string | null
  maxWind: string | null
  source: string | null
  damageThreat: string | null
}

function firstString(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) return value.trim()
  if (Array.isArray(value)) {
    const first = value.find((item) => typeof item === 'string' && item.trim())
    return typeof first === 'string' ? first.trim() : null
  }
  return null
}

function matchDescription(description: string, patterns: RegExp[]): string | null {
  for (const pattern of patterns) {
    const match = description.match(pattern)
    if (match?.[1]?.trim()) return match[1].trim()
  }
  return null
}

export function parseNwsHazardParameters(
  parameters: Record<string, unknown> | null | undefined,
  description = '',
): NwsHazardParameters {
  const p = parameters ?? {}
  // The MAX * tag patterns below share a shape. The `[.\s]*` separator is
  // greedy so it eats the `...` before the value rather than leaving a dot for
  // the number to claim (lazy matching turned "...1.75 IN" into ".1"). The
  // value itself allows an optional `<` and a missing leading zero, because
  // NWS writes a sub-severe bound as "<.75 IN" / "<50 MPH" when the product
  // was issued on the other criterion. Dropping the `<` would assert a size
  // the issuing office did not.
  const hail =
    firstString(p.maxHailSize) ??
    firstString(p.MaxHailSize) ??
    matchDescription(description, [
      /MAX HAIL SIZE[.\s]*(<?\s*(?:\d+(?:\.\d+)?|\.\d+)\s*(?:IN|INCHES)?)/i,
      /HAZARD\.{3}.*?([0-9.]+\s*IN(?:CH)?(?:\s*HAIL)?)/i,
    ])
  const wind =
    firstString(p.maxWindGust) ??
    firstString(p.MaxWindGust) ??
    matchDescription(description, [
      /MAX WIND GUST[.\s]*(<?\s*(?:\d+(?:\.\d+)?|\.\d+)\s*(?:MPH)?)/i,
      /HAZARD\.{3}.*?([0-9.]+\s*MPH)/i,
    ])
  const source =
    firstString(p.eventSource) ??
    firstString(p.tornadoDetection) ??
    matchDescription(description, [/SOURCE\.{3}(.+)/i])
  const damageThreat =
    firstString(p.thunderstormDamageThreat) ??
    firstString(p.tornadoDamageThreat) ??
    firstString(p.flashFloodDamageThreat)

  return {
    maxHail: hail,
    maxWind: wind,
    source,
    damageThreat,
  }
}

export function formatWarningTimeLeft(expires: string, nowMs = Date.now()): string {
  const exp = new Date(expires).getTime()
  if (!Number.isFinite(exp)) return 'UNKNOWN'
  const diff = exp - nowMs
  if (diff <= 0) return 'EXPIRED'
  const h = Math.floor(diff / (1000 * 60 * 60))
  const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}
