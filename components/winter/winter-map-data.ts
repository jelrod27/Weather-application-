import type { WinterContourFeature, WinterContours, WinterMapSnapshot } from '@/lib/winter/types'
export type WinterMapStatus = 'available' | 'empty' | 'unavailable' | 'stale' | 'expired' | 'invalid'

interface WinterMapState {
  status: WinterMapStatus
  contours: WinterContours
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isPosition(value: unknown): value is number[] {
  return Array.isArray(value) && value.length >= 2 && value.every(item => typeof item === 'number' && Number.isFinite(item))
    && Math.abs(value[0]) <= 180 && Math.abs(value[1]) <= 85.051129
}

function isRing(value: unknown): value is number[][] {
  if (!Array.isArray(value) || value.length < 4 || !value.every(isPosition)) return false
  const first = value[0]
  const last = value[value.length - 1]
  return first[0] === last[0] && first[1] === last[1]
}

function isPolygonCoordinates(value: unknown): value is number[][][] {
  return Array.isArray(value) && value.length > 0 && value.every(isRing)
}

function isContour(value: unknown): value is WinterContourFeature {
  if (!isRecord(value) || value.type !== 'Feature' || !isRecord(value.geometry) || !isRecord(value.properties)) return false
  const { geometry, properties } = value
  const validGeometry = geometry.type === 'Polygon'
    ? isPolygonCoordinates(geometry.coordinates)
    : geometry.type === 'MultiPolygon' && Array.isArray(geometry.coordinates)
      && geometry.coordinates.length > 0 && geometry.coordinates.every(isPolygonCoordinates)
  return validGeometry && typeof properties.category === 'string' && properties.category.length > 0
    && typeof properties.label === 'string' && properties.label.length > 0
    && typeof properties.color === 'string' && /^#[0-9a-f]{6}$/i.test(properties.color)
    && typeof properties.rank === 'number' && Number.isFinite(properties.rank)
}

/** Only normalized category styles and finite, closed geographic polygons reach OpenLayers. */
export function validateWinterContours(value: unknown): WinterContours {
  return {
    type: 'FeatureCollection',
    features: isRecord(value) && value.type === 'FeatureCollection' && Array.isArray(value.features)
      ? value.features.filter(isContour).sort((left, right) => left.properties.rank - right.properties.rank)
      : [],
  }
}

/** Forecast windows may start tomorrow; they must not have ended or exceeded source freshness. */
export function getWinterMapState(snapshot: WinterMapSnapshot | null, now: number): WinterMapState {
  const hidden = (status: WinterMapStatus): WinterMapState => ({ status, contours: { type: 'FeatureCollection', features: [] } })
  if (!snapshot) return hidden('unavailable')
  if (snapshot.status === 'unavailable' || snapshot.status === 'stale') return hidden(snapshot.status)
  const issuedAt = snapshot.issuedAt ? Date.parse(snapshot.issuedAt) : NaN
  const validFrom = snapshot.validFrom ? Date.parse(snapshot.validFrom) : NaN
  const validTo = snapshot.validTo ? Date.parse(snapshot.validTo) : NaN
  if (![issuedAt, validFrom, validTo, now].every(Number.isFinite)
    || validTo <= validFrom || issuedAt > validTo || issuedAt > now + 5 * 60_000) return hidden('invalid')
  if (validTo <= now) return hidden('expired')
  const freshnessHours = snapshot.selection.product === 'impacts' ? 6 : 30
  if (now - issuedAt >= freshnessHours * 60 * 60_000) return hidden('stale')
  const contours = validateWinterContours(snapshot.contours)
  if (snapshot.status === 'empty') {
    return snapshot.contours.features.length === 0 ? hidden('empty') : hidden('invalid')
  }
  return contours.features.length > 0 ? { status: 'available', contours } : hidden('invalid')
}
