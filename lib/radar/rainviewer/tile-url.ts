import type { RainViewerTileOptions } from '@/lib/radar/rainviewer/types'

export function formatRainViewerTileOptions(options: Pick<RainViewerTileOptions, 'smooth' | 'snow'>): string {
  return `${options.smooth ? 1 : 0}_${options.snow ? 1 : 0}`
}

export function buildRainViewerRadarTileTemplate(
  host: string,
  path: string,
  options: RainViewerTileOptions,
): string {
  const normalizedHost = host.replace(/\/$/, '')
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const optionSuffix = formatRainViewerTileOptions(options)
  return `${normalizedHost}${normalizedPath}/${options.size}/{z}/{x}/{y}/${options.colorScheme}/${optionSuffix}.png`
}

export function buildRainViewerCoverageTileTemplate(
  host: string,
  options: Pick<RainViewerTileOptions, 'size'>,
): string {
  const normalizedHost = host.replace(/\/$/, '')
  return `${normalizedHost}/v2/coverage/0/${options.size}/{z}/{x}/{y}/0/0_0.png`
}
