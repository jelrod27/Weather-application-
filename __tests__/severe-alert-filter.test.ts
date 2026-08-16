import { isSevereMonitorAlert, filterSevereMonitorAlerts } from '@/lib/services/severe-alert-filter'
import type { NWSAlertDetail } from '@/lib/services/nws-alerts-service'

describe('severe-alert-filter', () => {
  const alert = (event: string): Pick<NWSAlertDetail, 'event'> => ({ event })

  it('matches only tornado, severe thunderstorm, and flash flood warnings', () => {
    expect(isSevereMonitorAlert(alert('Tornado Warning'))).toBe(true)
    expect(isSevereMonitorAlert(alert('Severe Thunderstorm Warning'))).toBe(true)
    expect(isSevereMonitorAlert(alert('Flash Flood Warning'))).toBe(true)
  })

  it('rejects watches, winter, and hurricane products', () => {
    expect(isSevereMonitorAlert(alert('Tornado Watch'))).toBe(false)
    expect(isSevereMonitorAlert(alert('Severe Thunderstorm Watch'))).toBe(false)
    expect(isSevereMonitorAlert(alert('Winter Storm Warning'))).toBe(false)
    expect(isSevereMonitorAlert(alert('Hurricane Warning'))).toBe(false)
    expect(isSevereMonitorAlert(alert('Air Quality Alert'))).toBe(false)
  })

  it('filters a mixed list', () => {
    const mixed = [
      { event: 'Tornado Warning' },
      { event: 'Dense Fog Advisory' },
      { event: 'Severe Thunderstorm Watch' },
      { event: 'Flash Flood Warning' },
    ] as NWSAlertDetail[]

    expect(filterSevereMonitorAlerts(mixed).map((a) => a.event)).toEqual([
      'Tornado Warning',
      'Flash Flood Warning',
    ])
  })
})
