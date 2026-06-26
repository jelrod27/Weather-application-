/**
 * RainViewer tile URLs accept a {color} segment, but the CDN currently returns
 * the same pre-rendered palette for every scheme id. Display variants are applied
 * client-side (see getRainViewerDisplayFilter).
 */
export const RAINVIEWER_TILE_COLOR_PARAM = 2

export const RAINVIEWER_DISPLAY_SCHEMES = [
  { id: 6, label: 'NEXRAD Level-III' },
  { id: 2, label: 'Universal Blue' },
  { id: 1, label: 'Original' },
  { id: 4, label: 'The Weather Channel' },
  { id: 8, label: 'Rainbow' },
] as const

export type RainViewerDisplaySchemeId = (typeof RAINVIEWER_DISPLAY_SCHEMES)[number]['id']

const DISPLAY_FILTERS: Record<RainViewerDisplaySchemeId, string> = {
  6: 'contrast(1.18) saturate(1.12) brightness(1.04)',
  2: 'none',
  1: 'hue-rotate(-55deg) saturate(0.75) contrast(1.15) brightness(1.08)',
  4: 'hue-rotate(75deg) saturate(1.45) contrast(1.12) brightness(1.05)',
  8: 'hue-rotate(165deg) saturate(1.75) contrast(1.15) brightness(1.08)',
}

export function getRainViewerDisplayFilter(schemeId: number): string {
  return DISPLAY_FILTERS[schemeId as RainViewerDisplaySchemeId] ?? DISPLAY_FILTERS[2]
}

export function isRainViewerDisplaySchemeId(schemeId: number): schemeId is RainViewerDisplaySchemeId {
  return RAINVIEWER_DISPLAY_SCHEMES.some((scheme) => scheme.id === schemeId)
}
