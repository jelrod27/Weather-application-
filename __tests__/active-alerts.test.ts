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

it('retains disjoint active segments within one warning event', () => {
  const a = alert({ id: 'north', ugc: ['COC001'] })
  const b = alert({ id: 'south', ugc: ['COC003'], sent: '2026-09-25T11:00:00Z' })
  expect(selectActiveAlerts([a, b], now).map((item) => item.id)).toEqual(['north', 'south'])
  const cancel = alert({ id: 'cancel', ugc: ['COC001'], vtecAction: 'CAN', sent: '2026-09-25T11:30:00Z' })
  expect(selectActiveAlerts([a, b, cancel], now).map((item) => item.id)).toEqual(['south'])
})
it('resolves overlapping zone revisions before cancellation, regardless of arrival order', () => {
  const original = alert({ ugc: ['COC001', 'COC003'] })
  const continuation = alert({ id: 'continued', ugc: ['COC003'], vtecAction: 'CON', sent: '2026-09-25T11:00:00Z' })
  const cancel = alert({ id: 'cancel', ugc: ['COC001'], vtecAction: 'CAN', sent: '2026-09-25T11:00:00Z' })
  expect(selectActiveAlerts([cancel, continuation, original], now).map((item) => item.id)).toEqual(['continued'])
})
it('reports ambiguous partial geometry unavailable rather than reusing a cancelled area', () => {
  const original = alert({ ugc: ['COC001', 'COC003'] })
  const cancel = alert({ id: 'cancel', ugc: ['COC001'], vtecAction: 'CAN', sent: '2026-09-25T11:00:00Z' })
  expect(() => selectActiveAlerts([original, cancel], now)).toThrow('coverage')
})

it('confirms only the matching null-geometry segment through the UI point feed', async () => {
  const { pointConfirmationKeys } = await import('@/lib/warnings/active-alerts')
  const { splitLocalWarnings } = await import('@/lib/warnings/local-ranking')
  const a = alert({ id: 'a', ugc: ['COC001'] })
  const b = alert({ id: 'b', ugc: ['COC003'] })
  const updatedA = alert({ id: 'updated-a', ugc: ['COC001'] })
  const split = splitLocalWarnings([a, b], { lat: 39.74, lon: -104.99 }, new Set(pointConfirmationKeys(updatedA)))
  expect(split.onYou.map((item) => item.id)).toEqual(['a'])
  expect(split.elsewhere.map((item) => item.id)).toEqual(['b'])
})
