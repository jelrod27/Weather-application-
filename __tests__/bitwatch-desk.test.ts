/** @jest-environment node */

import { approxPopulationFromKm2, extractAreaStates, warningCoverageKm2 } from '@/lib/bitwatch/coverage'
import { warningDeskScore } from '@/lib/bitwatch/priority'
import { warningRadarCropSrc } from '@/lib/bitwatch/radar-crop'
import { filterDeskAlerts } from '@/lib/warnings/local-ranking'
import type { NWSAlertDetail } from '@/lib/services/nws-alerts-service'

const DENVER = {
  type: 'Polygon',
  coordinates: [
    [
      [-105.2, 39.6],
      [-104.8, 39.6],
      [-104.8, 40.0],
      [-105.2, 40.0],
      [-105.2, 39.6],
    ],
  ],
}

function alert(partial: Partial<NWSAlertDetail> & Pick<NWSAlertDetail, 'id' | 'event'>): NWSAlertDetail {
  return {
    headline: partial.event,
    severity: 'Severe',
    urgency: 'Immediate',
    expires: '2026-08-18T00:00:00Z',
    areaDesc: 'Denver, CO',
    sent: '',
    effective: '',
    ends: '',
    description: '',
    instruction: '',
    certainty: '',
    response: '',
    sender: '',
    geometry: DENVER,
    hazard: { maxHail: null, maxWind: null, source: null, damageThreat: null },
    messageType: 'Alert',
    warningEventId: partial.id,
    vtecAction: 'NEW',
    vtecRaw: [],
    ugc: ['COC031'],
    affectedZones: [],
    motion: null,
    ...partial,
  }
}

describe('warning coverage', () => {
  it('estimates area and approximate population without calling it a census', () => {
    const km2 = warningCoverageKm2(DENVER)
    expect(km2).toBeGreaterThan(1000)
    expect(approxPopulationFromKm2(km2!)).toBeGreaterThan(10_000)
    expect(extractAreaStates('Ford, KS; Hodgeman, KS')).toEqual(['KS'])
  })
})

describe('warningDeskScore', () => {
  it('scores PDS tornado above a routine severe thunderstorm', () => {
    const pds = warningDeskScore(
      alert({
        id: 't',
        event: 'Tornado Warning',
        headline: 'Particularly Dangerous Situation',
        severity: 'Extreme',
      }),
    )
    const svr = warningDeskScore(
      alert({
        id: 's',
        event: 'Severe Thunderstorm Warning',
        hazard: { maxHail: null, maxWind: null, source: null, damageThreat: 'destructive' },
      }),
    )
    expect(pds).toBeGreaterThan(svr)
    expect(pds).toBe(10)
    expect(svr).toBeGreaterThanOrEqual(8.5)
  })
})

describe('warningRadarCropSrc', () => {
  it('builds an Iowa NEXRAD GetMap proxy URL from the polygon bbox', () => {
    const src = warningRadarCropSrc(DENVER)
    expect(src).toContain('/api/weather/iowa-nexrad?')
    expect(src).toContain('REQUEST=GetMap')
    expect(src).toContain('LAYERS=nexrad-n0r')
    expect(src).toContain('BBOX=')
  })

  it('returns null without geometry', () => {
    expect(warningRadarCropSrc(null)).toBeNull()
  })
})

describe('filterDeskAlerts', () => {
  it('filters by event type and state', () => {
    const alerts = [
      alert({ id: 't', event: 'Tornado Warning', areaDesc: 'Denver, CO', ugc: ['COC031'] }),
      alert({ id: 's', event: 'Severe Thunderstorm Warning', areaDesc: 'Dallas, TX', ugc: ['TXC113'] }),
    ]
    expect(filterDeskAlerts(alerts, { query: '', event: 'Tornado Warning', state: '' }).map((a) => a.id)).toEqual([
      't',
    ])
    expect(filterDeskAlerts(alerts, { query: '', event: 'all', state: 'TX' }).map((a) => a.id)).toEqual(['s'])
  })
})
