export type RadarTileHealth = 'healthy' | 'retrying' | 'unavailable'

/** The public OpenLayers tile operations needed for image recovery. */
export interface RadarRetryTile {
  key: string
  getKey: () => string
  getTileCoord: () => number[]
  getState: () => number
  load: () => void
}

interface FailedTile {
  tile: RadarRetryTile
  retries: number
  timer: ReturnType<typeof setTimeout> | null
  retryAt: number | null
}

const RETRY_DELAYS_MS = [1000, 2000]
const MAX_TRACKED_FAILURES = 512
const TILE_LOADING = 1
const TILE_ERROR = 3

export function createRadarTileRecovery(onChange: (health: RadarTileHealth) => void): {
  setContext: (key: string, enabled: boolean, isVisible: (coordinate: number[]) => boolean) => void
  failed: (tile: RadarRetryTile) => void
  started: (tile: RadarRetryTile) => void
  loaded: (tile: RadarRetryTile) => void
  dispose: () => void
} {
  // Keep budgets across animation loops, bounded like the renderer's tile cache.
  const failures = new Map<string, FailedTile>()
  let currentKey = ''
  let enabled = false
  let disposed = false
  let isVisible = (_coordinate: number[]): boolean => true

  function relevant(entry: FailedTile): boolean {
    return enabled && entry.tile.key === currentKey && isVisible(entry.tile.getTileCoord())
  }

  function cancel(entry: FailedTile): void {
    if (entry.timer != null) clearTimeout(entry.timer)
    entry.timer = null
  }

  function publish(): void {
    if (disposed) return
    const active = [...failures.values()].filter(relevant)
    onChange(active.length === 0 ? 'healthy' : active.some((entry) =>
      entry.timer != null || entry.tile.getState() === TILE_LOADING,
    ) ? 'retrying' : 'unavailable')
  }

  function schedule(entry: FailedTile): void {
    if (disposed || !relevant(entry) || entry.timer != null
      || entry.retries >= RETRY_DELAYS_MS.length || entry.tile.getState() !== TILE_ERROR) return
    // Preserve the deadline when an animation frame temporarily leaves the view.
    // Otherwise a 500 ms/frame loop would always cancel the first 1 s retry.
    entry.retryAt ??= Date.now() + RETRY_DELAYS_MS[entry.retries]
    entry.timer = setTimeout(() => {
      entry.timer = null
      if (disposed || !relevant(entry) || entry.tile.getState() !== TILE_ERROR) return
      entry.retries++
      entry.retryAt = null
      // OpenLayers' public load() method retries ERROR tiles and redraws on success.
      entry.tile.load()
      publish()
    }, Math.max(0, entry.retryAt - Date.now()))
  }

  return {
    setContext(key, nextEnabled, nextIsVisible) {
      if (disposed) return
      currentKey = key
      enabled = nextEnabled
      isVisible = nextIsVisible
      for (const entry of failures.values()) {
        if (!relevant(entry)) cancel(entry)
        else schedule(entry)
      }
      publish()
    },
    failed(tile) {
      if (disposed) return
      const key = tile.getKey()
      const entry = failures.get(key) ?? { tile, retries: 0, timer: null, retryAt: null }
      entry.tile = tile
      failures.set(key, entry)
      if (failures.size > MAX_TRACKED_FAILURES) {
        const oldestKey = failures.keys().next().value!
        cancel(failures.get(oldestKey)!)
        failures.delete(oldestKey)
      }
      schedule(entry)
      publish()
    },
    started(tile) {
      if (disposed) return
      const entry = failures.get(tile.getKey())
      if (entry && entry.tile !== tile) {
        // The renderer can evict a failed object and request the same URL anew.
        // Follow that request without restoring its exhausted retry budget.
        cancel(entry)
        entry.tile = tile
      }
      publish()
    },
    loaded(tile) {
      if (disposed) return
      const entry = failures.get(tile.getKey())
      if (entry?.tile === tile) {
        cancel(entry)
        failures.delete(tile.getKey())
      }
      publish()
    },
    dispose() {
      disposed = true
      for (const entry of failures.values()) cancel(entry)
      failures.clear()
    },
  }
}
