import type { RainViewerTileOptions } from '@/lib/radar/rainviewer/types'

export function formatRainViewerTileOptions(options: Pick<RainViewerTileOptions, 'smooth' | 'snow'>): string {
  return `${options.smooth ? 1 : 0}_${options.snow ? 1 : 0}`
}

export function buildRainViewerRadarTileTemplate(
  host: string,
  path: string,
  options: RainViewerTileOptions,
  useProxy = true,
): string {
  const normalizedHost = host.replace(/\/$/, '')
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const optionSuffix = formatRainViewerTileOptions(options)
  const suffix = `${options.size}/{z}/{x}/{y}/${options.colorScheme}/${optionSuffix}.png`

  if (useProxy) {
    const cleanPath = normalizedPath.replace(/^\//, '')
    return `/api/radar/tile/${cleanPath}/${suffix}`
  }

  return `${normalizedHost}${normalizedPath}/${suffix}`
}

export function buildRainViewerCoverageTileTemplate(
  host: string,
  options: Pick<RainViewerTileOptions, 'size'>,
  useProxy = true,
): string {
  const normalizedHost = host.replace(/\/$/, '')
  const suffix = `v2/coverage/0/${options.size}/{z}/{x}/{y}/0/0_0.png`

  if (useProxy) {
    return `/api/radar/tile/${suffix}`
  }

  return `${normalizedHost}/${suffix}`
}
