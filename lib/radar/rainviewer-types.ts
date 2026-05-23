export interface RainViewerFrame {
  time: number
  path: string
}

export interface RainViewerMapsResponse {
  host: string
  past: RainViewerFrame[]
}

/** Normalize RainViewer public API JSON into frame list for animation. */
export function parseRainViewerMapsPayload(data: unknown): RainViewerMapsResponse | null {
  if (!data || typeof data !== 'object') return null

  const record = data as Record<string, unknown>
  const host = typeof record.host === 'string' ? record.host : 'https://tilecache.rainviewer.com'
  const radar = record.radar

  if (!radar || typeof radar !== 'object') return null

  const pastRaw = (radar as Record<string, unknown>).past
  if (!Array.isArray(pastRaw)) return null

  const past: RainViewerFrame[] = pastRaw
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      const frame = item as Record<string, unknown>
      const time = frame.time
      const path = frame.path
      if (typeof time !== 'number' || typeof path !== 'string') return null
      return { time, path }
    })
    .filter((f): f is RainViewerFrame => f !== null)
    .sort((a, b) => a.time - b.time)

  if (past.length === 0) return null

  return { host, past }
}

/** Build a tile URL for a RainViewer frame at z/x/y. */
export function rainViewerTileUrl(
  host: string,
  pathTemplate: string,
  z: number,
  x: number,
  y: number
): string {
  const path = pathTemplate
    .replace('{z}', String(z))
    .replace('{x}', String(x))
    .replace('{y}', String(y))
  return `${host.replace(/\/$/, '')}${path}`
}
