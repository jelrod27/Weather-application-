import { nwsGeometryBBox } from '@/lib/warnings/alert-links'
import type { NwsGeometry } from '@/lib/services/nws-alerts-service'

const MIN_PAD_DEG = 0.15

export function warningRadarCropSrc(geometry: NwsGeometry | null | undefined): string | null {
  const box = nwsGeometryBBox(geometry)
  if (!box) return null
  const padLat = Math.max(MIN_PAD_DEG, (box.maxLat - box.minLat) * 0.25)
  const padLon = Math.max(MIN_PAD_DEG, (box.maxLon - box.minLon) * 0.25)
  const minLon = Math.max(-180, box.minLon - padLon)
  const minLat = Math.max(-90, box.minLat - padLat)
  const maxLon = Math.min(180, box.maxLon + padLon)
  const maxLat = Math.min(90, box.maxLat + padLat)
  const params = new URLSearchParams({
    SERVICE: 'WMS',
    VERSION: '1.1.1',
    REQUEST: 'GetMap',
    LAYERS: 'nexrad-n0r',
    FORMAT: 'image/png',
    TRANSPARENT: 'true',
    SRS: 'EPSG:4326',
    BBOX: `${minLon.toFixed(4)},${minLat.toFixed(4)},${maxLon.toFixed(4)},${maxLat.toFixed(4)}`,
    WIDTH: '640',
    HEIGHT: '480',
  })
  return `/api/weather/iowa-nexrad?${params.toString()}`
}
