/**
 * One parser for NOAA SWPC time tags.
 *
 * SWPC ships the same instant in several shapes — `2026-09-08 15:55:00.000`,
 * `2026-09-08T15:55:00`, occasionally with a trailing `Z` — and never with an
 * offset. All of them mean UTC. `Date.parse` disagrees: given an unzoned tag it
 * falls back to *local* time, which is seven hours off in America/Los_Angeles
 * and a different amount off on every deploy region.
 *
 * This module exists because that normalization had been copied three times
 * (the two feed parsers and the SEO content component) and skipped in a fourth
 * place, so the same string resolved to different instants depending on which
 * code path read it.
 */

/** True when the tag already states a zone, so it must not be given another. */
const HAS_ZONE = /(?:[zZ]|[+-]\d{2}:?\d{2})$/

/**
 * Epoch milliseconds for a SWPC time tag, or `NaN` when it is unreadable.
 *
 * Always prefer this over `Date.parse` on a feed value: two tags compared with
 * different parsers, or the same parser across a DST boundary, produce deltas
 * that are wrong by an hour.
 */
export function swpcTimeTagMs(timeTag: unknown): number {
  const raw = typeof timeTag === 'string' ? timeTag.trim() : ''
  if (!raw) return Number.NaN
  const withT = raw.includes('T') ? raw : raw.replace(' ', 'T')
  return Date.parse(HAS_ZONE.test(withT) ? withT : `${withT}Z`)
}

/**
 * A SWPC time tag as both an ISO stamp for `dateModified` and a human label,
 * or null when the tag is unreadable.
 */
export function formatSwpcTimeTag(timeTag: string): { iso: string; label: string } | null {
  const ms = swpcTimeTagMs(timeTag)
  if (Number.isNaN(ms)) return null
  const iso = new Date(ms).toISOString()
  return { iso, label: `${iso.slice(0, 16).replace('T', ' ')} UTC` }
}
