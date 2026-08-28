/**
 * CARTO raster basemap URLs.
 *
 * Raster tiles now require `?key=` (watermark otherwise). The browser loads
 * tiles directly from cartocdn, so the key must be NEXT_PUBLIC_ and is visible
 * in tile requests — same class as a Maps JS key. Do not proxy these through
 * Vercel; one map pan is dozens of tiles.
 *
 * https://docs.carto.com/faqs/carto-basemaps
 */

const CARTO_SUBDOMAINS = ['a', 'b', 'c', 'd'] as const

export function withCartoApiKey(
  url: string,
  key: string | undefined = process.env.NEXT_PUBLIC_CARTO_API_KEY,
): string {
  const trimmed = key?.trim()
  if (!trimmed) return url
  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}key=${encodeURIComponent(trimmed)}`
}

export const CARTO_VOYAGER_XYZ_URL = withCartoApiKey(
  'https://{a-d}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
)

export const CARTO_DARK_XYZ_URL = withCartoApiKey(
  'https://{a-d}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
)

export function cartoVoyagerTileUrls(): string[] {
  return CARTO_SUBDOMAINS.map((subdomain) =>
    withCartoApiKey(
      `https://${subdomain}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png`,
    ),
  )
}
