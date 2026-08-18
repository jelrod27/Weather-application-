import { applySourceMessage } from '@/lib/bitwatch/lifecycle'
import { parseTimeMotLoc, projectMotion } from '@/lib/bitwatch/motion'
import {
  foldSourceMessages,
  nextWatermarkIso,
  overlapStartIso,
  reconcileWithActiveSnapshot,
} from '@/lib/bitwatch/ingest'
import { parseVtecFromParameters, provisionalWarningEventId } from '@/lib/bitwatch/vtec'
import { mapNwsFeatureToDetail, type NWSAlertDetail } from '@/lib/services/nws-alerts-service'

const FORD_VTEC = '/O.CON.KDDC.SV.W.0237.000000T0000Z-260807T0245Z/'
const NEW_TOR = '/O.NEW.KLWX.TO.W.0023.260418T2100Z-260418T2200Z/'
const UPG_WATCH = '/O.UPG.KLWX.TO.A.0012.260418T1800Z-260418T2200Z/'

function alert(partial: Partial<NWSAlertDetail> & Pick<NWSAlertDetail, 'id' | 'event' | 'sent'>): NWSAlertDetail {
  return {
    headline: partial.headline ?? partial.event,
    severity: 'Severe',
    urgency: 'Immediate',
    expires: '2026-08-07T02:45:00Z',
    areaDesc: 'Ford',
    effective: partial.sent,
    ends: '2026-08-07T02:45:00Z',
    description: '',
    instruction: 'Take shelter.',
    certainty: 'Observed',
    response: 'Shelter',
    sender: 'w-nws.webmaster@noaa.gov',
    geometry: null,
    hazard: { maxHail: null, maxWind: null, source: null, damageThreat: null },
    messageType: 'Alert',
    warningEventId: partial.id,
    vtecAction: null,
    vtecRaw: [],
    ugc: [],
    affectedZones: [],
    motion: null,
    ...partial,
  }
}

describe('parseVtecFromParameters', () => {
  it('identifies a Warning Event from P-VTEC, not the NWS feature id', () => {
    const parsed = parseVtecFromParameters(
      { VTEC: [FORD_VTEC] },
      '',
      '2026-08-07T02:25:00Z',
    )
    expect(parsed).toHaveLength(1)
    expect(parsed[0]?.eventId).toBe('KDDC.SV.W.0237.2026')
    expect(parsed[0]?.action).toBe('CON')
    expect(parsed[0]?.eventId).not.toContain('urn:oid')
  })

  it('uses sent year when VTEC start is the continuation placeholder', () => {
    const parsed = parseVtecFromParameters({ VTEC: [FORD_VTEC] }, '', '2026-08-07T02:25:00Z')
    expect(parsed[0]?.eventId.endsWith('.2026')).toBe(true)
  })
})

describe('provisionalWarningEventId', () => {
  it('uses the NWS id tail when VTEC is missing', () => {
    expect(provisionalWarningEventId('https://api.weather.gov/alerts/urn:oid:abc')).toBe(
      'provisional:urn:oid:abc',
    )
  })
})

describe('applySourceMessage', () => {
  it('keeps CON on the same Warning Event instead of treating it as a new id', () => {
    const first = applySourceMessage(new Map(), {
      nwsId: 'https://api.weather.gov/alerts/one',
      sent: '2026-08-07T02:05:00Z',
      capMessageType: 'Alert',
      vtecs: parseVtecFromParameters(
        { VTEC: ['/O.NEW.KDDC.SV.W.0237.260807T0205Z-260807T0245Z/'] },
        '',
        '2026-08-07T02:05:00Z',
      ),
      display: alert({
        id: 'https://api.weather.gov/alerts/one',
        event: 'Severe Thunderstorm Warning',
        sent: '2026-08-07T02:05:00Z',
      }),
    })
    const second = applySourceMessage(first, {
      nwsId: 'https://api.weather.gov/alerts/two',
      sent: '2026-08-07T02:25:00Z',
      capMessageType: 'Update',
      vtecs: parseVtecFromParameters({ VTEC: [FORD_VTEC] }, '', '2026-08-07T02:25:00Z'),
      display: alert({
        id: 'https://api.weather.gov/alerts/two',
        event: 'Severe Thunderstorm Warning',
        sent: '2026-08-07T02:25:00Z',
        messageType: 'Update',
      }),
    })
    expect(second.size).toBe(1)
    expect(second.get('KDDC.SV.W.0237.2026')?.status).toBe('active')
    expect(second.get('KDDC.SV.W.0237.2026')?.nwsId).toBe('https://api.weather.gov/alerts/two')
  })

  it('ends the watch and starts the warning on UPG+NEW in one message', () => {
    const events = applySourceMessage(new Map(), {
      nwsId: 'https://api.weather.gov/alerts/upg',
      sent: '2026-04-18T21:00:00Z',
      capMessageType: 'Alert',
      vtecs: parseVtecFromParameters({ VTEC: [UPG_WATCH, NEW_TOR] }, '', '2026-04-18T21:00:00Z'),
      display: alert({
        id: 'https://api.weather.gov/alerts/upg',
        event: 'Tornado Warning',
        sent: '2026-04-18T21:00:00Z',
      }),
    })
    expect(events.get('KLWX.TO.A.0012.2026')?.status).toBe('ended')
    expect(events.get('KLWX.TO.A.0012.2026')?.endedReason).toBe('upgraded')
    expect(events.get('KLWX.TO.W.0023.2026')?.status).toBe('active')
  })

  it('does not treat CAP Cancel as an all-clear for a different event', () => {
    const started = applySourceMessage(new Map(), {
      nwsId: 'https://api.weather.gov/alerts/a',
      sent: '2026-08-07T02:05:00Z',
      capMessageType: 'Alert',
      vtecs: parseVtecFromParameters(
        { VTEC: ['/O.NEW.KDDC.SV.W.0237.260807T0205Z-260807T0245Z/'] },
        '',
        '2026-08-07T02:05:00Z',
      ),
      display: alert({
        id: 'https://api.weather.gov/alerts/a',
        event: 'Severe Thunderstorm Warning',
        sent: '2026-08-07T02:05:00Z',
      }),
    })
    const cancelledOther = applySourceMessage(started, {
      nwsId: 'https://api.weather.gov/alerts/b',
      sent: '2026-08-07T02:10:00Z',
      capMessageType: 'Cancel',
      vtecs: parseVtecFromParameters(
        { VTEC: ['/O.CAN.KDDC.FF.W.0001.260807T0200Z-260807T0300Z/'] },
        '',
        '2026-08-07T02:10:00Z',
      ),
      display: alert({
        id: 'https://api.weather.gov/alerts/b',
        event: 'Flash Flood Warning',
        sent: '2026-08-07T02:10:00Z',
        messageType: 'Cancel',
      }),
    })
    expect(cancelledOther.get('KDDC.SV.W.0237.2026')?.status).toBe('active')
    expect(cancelledOther.get('KDDC.FF.W.0001.2026')?.status).toBe('ended')
  })
})

describe('ingest helpers', () => {
  it('overlaps the watermark by 15 minutes', () => {
    expect(overlapStartIso('2026-08-07T02:25:00.000Z', Date.parse('2026-08-07T02:26:00Z'))).toBe(
      '2026-08-07T02:10:00.000Z',
    )
  })

  it('does not advance a watermark when there are no new sent times', () => {
    expect(nextWatermarkIso('2026-08-07T02:00:00.000Z', [])).toBe('2026-08-07T02:00:00.000Z')
  })

  it('folds NEW then CON onto one active event', () => {
    const folded = foldSourceMessages([
      alert({
        id: 'one',
        event: 'Severe Thunderstorm Warning',
        sent: '2026-08-07T02:05:00Z',
        vtecRaw: ['/O.NEW.KDDC.SV.W.0237.260807T0205Z-260807T0245Z/'],
        description: 'NEW',
      }),
      alert({
        id: 'two',
        event: 'Severe Thunderstorm Warning',
        sent: '2026-08-07T02:25:00Z',
        messageType: 'Update',
        vtecRaw: [FORD_VTEC],
        description: 'CON',
      }),
    ])
    expect(folded.size).toBe(1)
    expect(folded.get('KDDC.SV.W.0237.2026')?.nwsId).toBe('two')
  })

  it('does not expire an active snapshot member just because collection was empty', () => {
    const current = foldSourceMessages([
      alert({
        id: 'live',
        event: 'Tornado Warning',
        sent: '2026-08-07T02:05:00Z',
        vtecRaw: [NEW_TOR],
        warningEventId: 'KLWX.TO.W.0023.2026',
        expires: '2026-08-07T03:00:00Z',
      }),
    ])
    const reconciled = reconcileWithActiveSnapshot(new Map(), [...current.values()].map((e) => e.display), Date.parse('2026-08-07T02:10:00Z'))
    expect(reconciled.get('KLWX.TO.W.0023.2026')?.status).toBe('active')
  })
})

describe('parseTimeMotLoc', () => {
  it('reads packed lat/lon as US hundredths of degrees', () => {
    const motion = parseTimeMotLoc('TIME...MOT...LOC 0225Z 270DEG 25KT 3776 9992')
    expect(motion).toEqual({
      timeZ: '0225Z',
      headingDeg: 270,
      speedKt: 25,
      lat: 37.76,
      lon: -99.92,
    })
  })

  it('projects motion westward', () => {
    const start = parseTimeMotLoc('TIME...MOT...LOC 0225Z 270DEG 60KT 3776 9992')
    expect(start).not.toBeNull()
    const dest = projectMotion(start!, 60)
    expect(dest.lon).toBeLessThan(start!.lon)
    expect(dest.lat).toBeCloseTo(start!.lat, 0)
  })
})

describe('mapNwsFeatureToDetail', () => {
  it('copies VTEC and TIME...MOT...LOC onto the display record', () => {
    const detail = mapNwsFeatureToDetail({
      geometry: { type: 'Polygon', coordinates: [[[-100, 37], [-99, 37], [-99, 38], [-100, 38], [-100, 37]]] },
      properties: {
        id: 'https://api.weather.gov/alerts/urn:oid:ford',
        event: 'Severe Thunderstorm Warning',
        severity: 'Severe',
        urgency: 'Immediate',
        sent: '2026-08-07T02:25:00Z',
        expires: '2026-08-07T02:45:00Z',
        areaDesc: 'Ford, KS',
        messageType: 'Update',
        sender: 'w-nws.webmaster@noaa.gov',
        description: 'TIME...MOT...LOC 0225Z 270DEG 25KT 3776 9992',
        parameters: { VTEC: [FORD_VTEC], maxHailSize: ['1.75'] },
        geocode: { UGC: ['KSC057'] },
      },
    })
    expect(detail.warningEventId).toBe('KDDC.SV.W.0237.2026')
    expect(detail.vtecAction).toBe('CON')
    expect(detail.ugc).toEqual(['KSC057'])
    expect(detail.motion?.headingDeg).toBe(270)
    expect(detail.hazard.maxHail).toBe('1.75')
  })
})
