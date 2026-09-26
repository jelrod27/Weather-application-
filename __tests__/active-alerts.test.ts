import { selectActiveAlerts } from '@/lib/warnings/active-alerts'
import type { NWSAlertDetail } from '@/lib/services/nws-alerts-service'

const now = Date.parse('2026-09-25T12:00:00Z')
function alert(overrides: Partial<NWSAlertDetail> = {}): NWSAlertDetail {
  return { id: 'a', warningEventId: 'event', sent: '2026-09-25T10:00:00Z', effective: '',
    expires: '2026-09-25T13:00:00Z', ends: '', messageType: 'Alert', vtecAction: 'NEW',
    headline: '', event: 'Tornado Warning', severity: 'Severe', urgency: 'Immediate', areaDesc: '',
    description: '', instruction: '', certainty: '', response: '', sender: '', geometry: null,
    hazard: { maxHail: null, maxWind: null, source: null, damageThreat: null }, vtecRaw: [], ugc: [], affectedZones: [], motion: null,
    ...overrides }
}
it('excludes warnings at the earliest source expiration boundary', () => {
  expect(selectActiveAlerts([alert()], now)).toHaveLength(1)
  expect(selectActiveAlerts([alert({ expires: new Date(now).toISOString() })], now)).toEqual([])
  expect(selectActiveAlerts([alert({ ends: new Date(now).toISOString() })], now)).toEqual([])
})
it.each(['CAN', 'EXP', 'UPG'])('does not revive a superseded event after %s', (vtecAction) => {
  const ended = alert({ id: 'b', sent: '2026-09-25T11:00:00Z', vtecAction })
  expect(selectActiveAlerts([ended, alert()], now)).toEqual([])
})
it('handles cancellation and future effective time', () => {
  expect(selectActiveAlerts([alert({ messageType: 'Cancel' })], now)).toEqual([])
  expect(selectActiveAlerts([alert({ effective: '2026-09-25T14:00:00Z' })], now)).toEqual([])
})
it('reports unverifiable validity instead of implying an all-clear', () => {
  expect(() => selectActiveAlerts([alert({ expires: 'invalid' })], now)).toThrow('validity')
})
