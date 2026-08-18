const COORDS_LIKE = /^-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?$/

export function isUsableCityLabel(label: string | null | undefined): boolean {
  const trimmed = label?.trim() ?? ''
  if (trimmed.length < 2) return false
  if (COORDS_LIKE.test(trimmed)) return false
  if (trimmed.toLowerCase() === 'current location') return false
  return true
}

export type HomeBootstrapSource =
  | { kind: 'search'; query: string }
  | { kind: 'gps' }
  | { kind: 'none' }

/**
 * Home weather bootstrap. A remembered city pin always beats GPS/IP so
 * auto-detect cannot clobber a search or warning-center pin.
 */
export function pickHomeBootstrapSource(input: {
  shouldAutoLocate: boolean
  profileDefault: string | null | undefined
  lastDisplayedCity: string | null | undefined
  cachedDisplayName: string | null | undefined
}): HomeBootstrapSource {
  if (!input.shouldAutoLocate) {
    if (isUsableCityLabel(input.profileDefault)) {
      return { kind: 'search', query: input.profileDefault!.trim() }
    }
    return { kind: 'none' }
  }

  if (isUsableCityLabel(input.profileDefault)) {
    return { kind: 'search', query: input.profileDefault!.trim() }
  }
  if (isUsableCityLabel(input.lastDisplayedCity)) {
    return { kind: 'search', query: input.lastDisplayedCity!.trim() }
  }
  if (isUsableCityLabel(input.cachedDisplayName)) {
    return { kind: 'search', query: input.cachedDisplayName!.trim() }
  }
  return { kind: 'gps' }
}
