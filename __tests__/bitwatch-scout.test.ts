/** @jest-environment node */

import { scoutApproachingPlace } from '@/lib/bitwatch/scout'
import type { NWSAlertDetail } from '@/lib/services/nws-alerts-service'

function alert(partial: Partial<NWSAlertDetail> & Pick<NWSAlertDetail, 'id' | 'event'>): NWSAlertDetail {
  return {
    headline: partial.event,
    severity: 'Severe',
    urgency: 'Immediate',
    expires: '2026-08-18T00:00:00Z',
    areaDesc: 'Test',
    sent: '',
    effective: '',
    ends: '',
    description: '',
    instruction: '',
    certainty: '',
    response: '',
    sender: '',
    geometry: null,
    hazard: { maxHail: null, maxWind: null, source: null, damageThreat: null },
    messageType: 'Alert',
    warningEventId: partial.id,
    vtecAction: 'NEW',
    vtecRaw: [],
    ugc: [],
    affectedZones: [],
    motion: null,
    ...partial,
  }
}

describe('scoutApproachingPlace', () => {
  const denver = { lat: 39.74, lon: -104.99 }

  it('hits when TIME...MOT...LOC projects toward the pin', () => {
    const hit = scoutApproachingPlace(denver.lat, denver.lon, [
      alert({
        id: 'west',
        event: 'Severe Thunderstorm Warning',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [-105.6, 39.6],
              [-105.3, 39.6],
              [-105.3, 39.9],
              [-105.6, 39.9],
              [-105.6, 39.6],
            ],
          ],
        },
        motion: { timeZ: '0100Z', headingDeg: 90, speedKt: 50, lat: 39.74, lon: -105.4 },
      }),
    ])
    expect(hit?.minutesAhead).toBeGreaterThan(0)
    expect(hit?.source.id).toBe('west')
  })

  it('does not fire when the Warning Event already covers the pin', () => {
    const covering = {
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
    expect(
      scoutApproachingPlace(denver.lat, denver.lon, [
        alert({
          id: 'cover',
          event: 'Tornado Warning',
          geometry: covering,
          motion: { timeZ: '0100Z', headingDeg: 90, speedKt: 50, lat: 39.74, lon: -105.4 },
        }),
      ]),
    ).toBeNull()
  })
})
