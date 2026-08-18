/** @jest-environment node */

import { coveringAlerts, eventKey, matchProtectedPlace } from '@/lib/bitwatch/match'

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

describe('matchProtectedPlace', () => {
  it('covers a pin inside the polygon', () => {
    expect(matchProtectedPlace(39.74, -104.99, { id: 'a', warningEventId: 'E', geometry: DENVER_POLYGON })).toEqual({
      covered: true,
      method: 'polygon',
    })
  })

  it('does not cover a pin outside the polygon', () => {
    expect(matchProtectedPlace(32.8, -96.8, { id: 'a', warningEventId: 'E', geometry: DENVER_POLYGON })).toEqual({
      covered: false,
      method: 'polygon',
    })
  })

  it('does not treat null geometry as coverage', () => {
    expect(matchProtectedPlace(39.74, -104.99, { id: 'a', warningEventId: 'E', geometry: null })).toEqual({
      covered: false,
      method: 'unresolved',
    })
  })

  it('uses the NWS point-active feed when geometry is missing', () => {
    const keys = new Set(['a', 'E'])
    expect(
      matchProtectedPlace(39.74, -104.99, { id: 'a', warningEventId: 'E', geometry: null }, keys),
    ).toEqual({ covered: true, method: 'point-active' })
  })
})

describe('coveringAlerts / eventKey', () => {
  it('prefers VTEC Warning Event identity over the NWS feature id', () => {
    expect(eventKey({ id: 'urn:oid:1', warningEventId: 'KLWX.TO.W.0023.2026' })).toBe(
      'KLWX.TO.W.0023.2026',
    )
  })

  it('filters to covering events only', () => {
    const alerts = [
      { id: 'in', warningEventId: 'A', geometry: DENVER_POLYGON },
      {
        id: 'out',
        warningEventId: 'B',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [-97.0, 32.6],
              [-96.6, 32.6],
              [-96.6, 32.9],
              [-97.0, 32.9],
              [-97.0, 32.6],
            ],
          ],
        },
      },
    ]
    const covered = coveringAlerts(39.74, -104.99, alerts)
    expect(covered.map((alert) => alert.id)).toEqual(['in'])
  })
})
