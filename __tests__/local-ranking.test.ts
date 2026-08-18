import { compareWarningPriority, isLocalWarning, isNearbyWarning, splitLocalWarnings } from '@/lib/warnings/local-ranking'
import type { NWSAlertDetail } from '@/lib/services/nws-alerts-service'

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

function alert(partial: Partial<NWSAlertDetail> & Pick<NWSAlertDetail, 'event' | 'id'>): NWSAlertDetail {
  return {
    headline: partial.headline ?? partial.event,
    severity: partial.severity ?? 'Severe',
    urgency: partial.urgency ?? 'Immediate',
    expires: partial.expires ?? '2026-07-04T00:00:00Z',
    areaDesc: partial.areaDesc ?? 'Test area',
    sent: '',
    effective: '',
    ends: '',
    description: '',
    instruction: '',
    certainty: '',
    response: '',
    sender: '',
    geometry: partial.geometry ?? null,
    hazard: {
      maxHail: null,
      maxWind: null,
      source: null,
      damageThreat: null,
    },
    ...partial,
  }
}

describe('local-ranking', () => {
  it('ranks tornado above flash flood above severe thunderstorm', () => {
    const tornado = alert({ id: 't', event: 'Tornado Warning', severity: 'Moderate' })
    const flood = alert({ id: 'f', event: 'Flash Flood Warning', severity: 'Extreme' })
    const svr = alert({ id: 's', event: 'Severe Thunderstorm Warning', severity: 'Extreme' })
    const winter = alert({ id: 'w', event: 'Winter Storm Warning', severity: 'Extreme' })

    const sorted = [winter, svr, flood, tornado].sort(compareWarningPriority)
    expect(sorted.map((a) => a.id)).toEqual(['t', 'f', 's', 'w'])
  })

  it('does not treat missing geometry as local', () => {
    expect(
      isLocalWarning(alert({ id: 'x', event: 'Tornado Warning', geometry: null }), {
        lat: 39.74,
        lon: -104.99,
      }),
    ).toBe(false)
  })

  it('splits on-you vs elsewhere by polygon match', () => {
    const onYou = alert({
      id: 'local',
      event: 'Tornado Warning',
      geometry: DENVER_POLYGON,
    })
    const elsewhere = alert({
      id: 'away',
      event: 'Flash Flood Warning',
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
    })
    const unknown = alert({ id: 'unknown', event: 'Severe Thunderstorm Warning', geometry: null })

    const split = splitLocalWarnings([elsewhere, unknown, onYou], { lat: 39.74, lon: -104.99 })
    expect(split.onYou.map((a) => a.id)).toEqual(['local'])
    expect(split.nearby.map((a) => a.id)).toEqual([])
    expect(split.elsewhere.map((a) => a.id)).toEqual(['away', 'unknown'])
  })

  it('puts a close-but-not-covering cell in nearby, not on you', () => {
    const covering = alert({
      id: 'cover',
      event: 'Tornado Warning',
      geometry: DENVER_POLYGON,
    })
    const near = alert({
      id: 'near',
      event: 'Severe Thunderstorm Warning',
      geometry: DENVER_POLYGON,
    })
    const far = alert({
      id: 'far',
      event: 'Flash Flood Warning',
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
    })
    const unknown = alert({ id: 'unknown', event: 'Winter Storm Warning', geometry: null })

    const split = splitLocalWarnings([far, unknown, covering, near], { lat: 40.0, lon: -104.95 })
    expect(isNearbyWarning(covering, { lat: 40.0, lon: -104.95 })).toBe(true)
    expect(isNearbyWarning(far, { lat: 40.0, lon: -104.95 })).toBe(false)
    expect(split.onYou.map((a) => a.id)).toEqual([])
    expect(split.nearby.map((a) => a.id)).toEqual(['cover', 'near'])
    expect(split.elsewhere.map((a) => a.id)).toEqual(['far', 'unknown'])
  })

  it('keeps a pin near an unclosed closing edge in nearby, not elsewhere', () => {
    const unclosed = alert({
      id: 'unclosed',
      event: 'Severe Thunderstorm Warning',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-105.2, 39.6],
            [-104.7, 39.6],
            [-104.7, 39.9],
            [-105.2, 39.9],
          ],
        ],
      },
    })
    const pin = { lat: 39.75, lon: -105.25 }
    expect(isLocalWarning(unclosed, pin)).toBe(false)
    expect(isNearbyWarning(unclosed, pin)).toBe(true)
    expect(splitLocalWarnings([unclosed], pin).nearby.map((a) => a.id)).toEqual(['unclosed'])
  })

  it('treats a null-geometry warning as on-you when the point-active feed includes it', () => {
    const zone = alert({ id: 'zone-tor', event: 'Tornado Warning', geometry: null })
    const split = splitLocalWarnings([zone], { lat: 39.74, lon: -104.99 }, new Set(['zone-tor']))
    expect(split.onYou.map((a) => a.id)).toEqual(['zone-tor'])
    expect(split.elsewhere.map((a) => a.id)).toEqual([])
  })
})
