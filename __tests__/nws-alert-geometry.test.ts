import { distanceKmToNwsGeometry, pointInNwsGeometry } from '@/lib/services/nws-alert-geometry'

const DENVER_POLYGON = {
  type: 'Polygon',
  coordinates: [
    [
      [-105.2, 39.6],
      [-104.7, 39.6],
      [-104.7, 39.9],
      [-105.2, 39.9],
      [-105.2, 39.6],
    ],
  ],
}

describe('pointInNwsGeometry', () => {
  it('matches a pin inside a warning polygon', () => {
    expect(pointInNwsGeometry(39.74, -104.99, DENVER_POLYGON)).toBe(true)
  })

  it('rejects a pin outside a warning polygon', () => {
    expect(pointInNwsGeometry(32.78, -96.8, DENVER_POLYGON)).toBe(false)
  })

  it('does not treat missing geometry as a match', () => {
    expect(pointInNwsGeometry(39.74, -104.99, null)).toBe(false)
  })

  it('does not treat a polygon with an unreadable hole as coverage', () => {
    expect(
      pointInNwsGeometry(39.74, -104.99, {
        type: 'Polygon',
        coordinates: [
          DENVER_POLYGON.coordinates[0],
          [
            [-105.0, 39.7],
            [-104.9, 39.7],
          ],
        ],
      }),
    ).toBe(false)
  })

  it('matches a pin in any polygon of a MultiPolygon', () => {
    expect(
      pointInNwsGeometry(39.74, -104.99, {
        type: 'MultiPolygon',
        coordinates: [
          [
            [
              [-96.9, 32.7],
              [-96.7, 32.7],
              [-96.7, 32.9],
              [-96.9, 32.9],
              [-96.9, 32.7],
            ],
          ],
          DENVER_POLYGON.coordinates,
        ],
      }),
    ).toBe(true)
  })
})

describe('distanceKmToNwsGeometry', () => {
  it('is zero when the pin is inside the polygon', () => {
    expect(distanceKmToNwsGeometry(39.74, -104.99, DENVER_POLYGON)).toBe(0)
  })

  it('measures distance to the nearest vertex when the pin is outside', () => {
    const km = distanceKmToNwsGeometry(40.0, -104.95, DENVER_POLYGON)
    expect(km).not.toBeNull()
    expect(km as number).toBeGreaterThan(8)
    expect(km as number).toBeLessThan(15)
  })

  it('returns null when geometry is missing', () => {
    expect(distanceKmToNwsGeometry(39.74, -104.99, null)).toBeNull()
  })
})
