import type { RadarFrame, RadarProvider } from '@/lib/radar'

export function buildRadarXyzUrl(provider: RadarProvider, frame: RadarFrame): string | null {
  if (!provider.xyz) return null
  return provider.xyz.urlTemplate.replace('{epochSeconds}', String(frame.epochSeconds))
}
