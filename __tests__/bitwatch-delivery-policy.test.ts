/** @jest-environment node */

import {
  DEFAULT_HAZARD_PREFS,
  isIbWUpgrade,
  wantsHazard,
  WARNING_ENDED_INSTRUCTION,
} from '@/lib/bitwatch/delivery-policy'
import type { NWSAlertDetail } from '@/lib/services/nws-alerts-service'

function alert(partial: Partial<NWSAlertDetail> & Pick<NWSAlertDetail, 'event'>): NWSAlertDetail {
  return {
    id: 'id',
    headline: partial.event,
    severity: 'Severe',
    urgency: 'Immediate',
    expires: '2026-08-18T00:00:00Z',
    areaDesc: 'Denver',
    sent: '2026-08-18T00:00:00Z',
    effective: '2026-08-18T00:00:00Z',
    ends: '2026-08-18T01:00:00Z',
    description: '',
    instruction: '',
    certainty: 'Observed',
    response: 'Shelter',
    sender: 'NWS',
    geometry: null,
    hazard: { maxHail: null, maxWind: null, source: null, damageThreat: null },
    messageType: 'Alert',
    warningEventId: 'id',
    vtecAction: 'NEW',
    vtecRaw: [],
    ugc: [],
    affectedZones: [],
    motion: null,
    ...partial,
  }
}

describe('wantsHazard', () => {
  it('honors per-hazard Delivery toggles', () => {
    expect(wantsHazard('Tornado Warning', DEFAULT_HAZARD_PREFS)).toBe(true)
    expect(wantsHazard('Tornado Warning', { ...DEFAULT_HAZARD_PREFS, notifyTornado: false })).toBe(
      false,
    )
    expect(wantsHazard('Severe Thunderstorm Warning', DEFAULT_HAZARD_PREFS)).toBe(true)
    expect(wantsHazard('Flash Flood Warning', DEFAULT_HAZARD_PREFS)).toBe(true)
    expect(wantsHazard('Winter Storm Warning', DEFAULT_HAZARD_PREFS)).toBe(false)
  })
})

describe('isIbWUpgrade', () => {
  it('treats considerable/destructive IBW tags as an upgrade', () => {
    expect(
      isIbWUpgrade(
        alert({
          event: 'Severe Thunderstorm Warning',
          hazard: { maxHail: null, maxWind: null, source: null, damageThreat: 'destructive' },
        }),
      ),
    ).toBe(true)
  })

  it('treats PDS / observed tornado wording as an upgrade', () => {
    expect(
      isIbWUpgrade(
        alert({
          event: 'Tornado Warning',
          headline: 'Particularly Dangerous Situation',
        }),
      ),
    ).toBe(true)
  })

  it('does not upgrade a routine severe thunderstorm warning', () => {
    expect(isIbWUpgrade(alert({ event: 'Severe Thunderstorm Warning' }))).toBe(false)
  })
})

describe('ended copy', () => {
  it('refuses all-clear language', () => {
    expect(WARNING_ENDED_INSTRUCTION.toLowerCase()).toContain('not an all-clear')
    expect(WARNING_ENDED_INSTRUCTION.toLowerCase()).not.toContain('all clear')
  })
})
