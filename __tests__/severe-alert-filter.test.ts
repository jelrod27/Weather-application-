import { isSevereMonitorAlert, filterSevereMonitorAlerts } from '@/lib/services/severe-alert-filter'
import type { NWSAlertDetail } from '@/lib/services/nws-alerts-service'

describe('severe-alert-filter', () => {
  const alert = (event: string): Pick<NWSAlertDetail, 'event'> => ({ event })

  it('matches tornado and thunderstorm warnings', () => {
    expect(isSevereMonitorAlert(alert('Tornado Warning'))).toBe(true)
    expect(isSevereMonitorAlert(alert('Severe Thunderstorm Warning'))).toBe(true)
  })

  it('matches flood and winter products', () => {
    expect(isSevereMonitorAlert(alert('Flash Flood Warning'))).toBe(true)
    expect(isSevereMonitorAlert(alert('Winter Storm Warning'))).toBe(true)
  })

  it('rejects non-severe products', () => {
    expect(isSevereMonitorAlert(alert('Air Quality Alert'))).toBe(false)
    expect(isSevereMonitorAlert(alert('Beach Hazards Statement'))).toBe(false)
  })

  it('filters a mixed list', () => {
    const mixed = [
      { event: 'Tornado Warning' },
      { event: 'Dense Fog Advisory' },
      { event: 'Severe Thunderstorm Watch' },
    ] as NWSAlertDetail[]

    expect(filterSevereMonitorAlerts(mixed).map((a) => a.event)).toEqual([
      'Tornado Warning',
      'Severe Thunderstorm Watch',
    ])
  })
})
