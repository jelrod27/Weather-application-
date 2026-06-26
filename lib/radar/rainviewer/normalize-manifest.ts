import type { RainViewerManifest, RainViewerManifestResponse } from '@/lib/radar/rainviewer/types'

function isPastFrame(value: unknown): value is { time: number; path: string } {
  if (!value || typeof value !== 'object') return false
  const frame = value as { time?: unknown; path?: unknown }
  return typeof frame.time === 'number'
    && Number.isFinite(frame.time)
    && typeof frame.path === 'string'
    && frame.path.length > 0
}

export function normalizeRainViewerManifest(payload: unknown): RainViewerManifest {
  if (!payload || typeof payload !== 'object') {
    throw new Error('RainViewer manifest payload is invalid')
  }

  const data = payload as RainViewerManifestResponse
  const host = typeof data.host === 'string' && data.host.length > 0
    ? data.host.replace(/\/$/, '')
    : null
  const generated = typeof data.generated === 'number' && Number.isFinite(data.generated)
    ? data.generated
    : null
  const version = typeof data.version === 'string' ? data.version : 'unknown'
  const past = Array.isArray(data.radar?.past)
    ? data.radar.past.filter(isPastFrame)
    : []

  if (!host || generated == null) {
    throw new Error('RainViewer manifest missing host or generated timestamp')
  }

  if (past.length === 0) {
    throw new Error('RainViewer manifest has no past radar frames')
  }

  return {
    version,
    generated,
    host,
    past,
  }
}
