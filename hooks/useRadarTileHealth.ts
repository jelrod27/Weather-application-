'use client'

import { useEffect, useRef, useState } from 'react'
import { createRadarTileRecovery } from '@/lib/radar/radar-tile-recovery'
import type { RadarTileHealth } from '@/lib/radar/radar-tile-recovery'
import type Map from 'ol/Map'
import type XYZ from 'ol/source/XYZ'
import type { TileSourceEvent } from 'ol/source/Tile'

export function useRadarTileHealth(source: XYZ | null, map: Map | null, enabled: boolean): RadarTileHealth {
  const [health, setHealth] = useState<RadarTileHealth>('healthy')
  const enabledRef = useRef(enabled)
  const updateContextRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    setHealth('healthy')
    if (!source || !map) return
    const recovery = createRadarTileRecovery(setHealth)
    const updateContext = () => {
      const size = map.getSize()
      const extent = size ? map.getView().calculateExtent(size) : null
      const grid = source.getTileGrid()
      const resolution = map.getView().getResolution()
      const zoom = grid && resolution != null ? grid.getZForResolution(resolution, source.zDirection) : null
      recovery.setContext(source.getKey(), enabledRef.current, (coordinate) => {
        if (zoom != null && coordinate[0] !== zoom) return false
        if (!extent || !grid) return true
        const tileExtent = grid.getTileCoordExtent(coordinate)
        return extent[0] <= tileExtent[2] && extent[2] >= tileExtent[0]
          && extent[1] <= tileExtent[3] && extent[3] >= tileExtent[1]
      })
    }
    updateContextRef.current = updateContext
    const stopDuringMove = () => recovery.setContext(source.getKey(), false, () => false)
    const failed = (event: TileSourceEvent) => recovery.failed(event.tile)
    const started = (event: TileSourceEvent) => recovery.started(event.tile)
    const loaded = (event: TileSourceEvent) => recovery.loaded(event.tile)
    source.on('tileloaderror', failed)
    source.on('tileloadstart', started)
    source.on('tileloadend', loaded)
    source.on('change', updateContext)
    map.on('movestart', stopDuringMove)
    map.on('moveend', updateContext)
    updateContext()
    return () => {
      recovery.dispose()
      updateContextRef.current = null
      source.un('tileloaderror', failed)
      source.un('tileloadstart', started)
      source.un('tileloadend', loaded)
      source.un('change', updateContext)
      map.un('movestart', stopDuringMove)
      map.un('moveend', updateContext)
    }
  }, [source, map])

  useEffect(() => {
    enabledRef.current = enabled
    updateContextRef.current?.()
  }, [enabled])

  return health
}
