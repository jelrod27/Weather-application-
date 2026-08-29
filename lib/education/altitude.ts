/**
 * Parsing for the free-text `altitudeRange` field on cloud Entries.
 *
 * Every value in data/cloud-types.ts takes the form "1,000-60,000+ ft", with an
 * optional metric gloss in parentheses. The `+` marks a top that is a floor
 * rather than a ceiling — cumulonimbus does not stop at exactly 60,000 ft.
 */

export interface AltitudeRange {
  baseFt: number
  topFt: number
  /** True when the source wrote "60,000+", meaning the top is open-ended. */
  openTop: boolean
}

const RANGE = /^\s*([\d,]+)\s*-\s*([\d,]+)\s*(\+?)\s*ft/i

/** Returns null for anything that does not match, so callers can skip the diagram. */
export function parseAltitudeRange(raw: string | undefined | null): AltitudeRange | null {
  if (!raw) return null
  const match = RANGE.exec(raw)
  if (!match) return null

  const baseFt = Number(match[1].replace(/,/g, ''))
  const topFt = Number(match[2].replace(/,/g, ''))
  if (!Number.isFinite(baseFt) || !Number.isFinite(topFt)) return null
  if (topFt <= baseFt) return null

  return { baseFt, topFt, openTop: match[3] === '+' }
}
