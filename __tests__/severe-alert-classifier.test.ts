import { classifySevereAlertTier, shouldEmailSevereAlertTier } from '@/lib/services/severe-alert-classifier'
import type { NWSAlertDetail } from '@/lib/services/nws-alerts-service'

function alert(partial: Partial<NWSAlertDetail> & Pick<NWSAlertDetail, 'event'>): NWSAlertDetail {
  return {
    id: 'test',
    headline: partial.headline ?? partial.event,
    severity: partial.severity ?? 'Severe',
    urgency: partial.urgency ?? 'Immediate',
    expires: partial.expires ?? '2026-07-04T00:00:00Z',
    areaDesc: partial.areaDesc ?? 'Test area',
    sent: partial.sent ?? '',
    effective: partial.effective ?? '',
    ends: partial.ends ?? '',
    description: partial.description ?? '',
    instruction: partial.instruction ?? '',
    certainty: partial.certainty ?? '',
    response: partial.response ?? '',
    sender: partial.sender ?? '',
    geometry: partial.geometry ?? null,
    event: partial.event,
  }
}

describe('severe-alert-classifier', () => {
  it('classifies tornado emergency as critical', () => {
    expect(
      classifySevereAlertTier(
        alert({
          event: 'Tornado Warning',
          headline: 'Tornado Emergency for Example County',
        }),
      ),
    ).toBe('critical')
  })

  it('classifies PDS severe thunderstorm warnings as critical', () => {
    expect(
      classifySevereAlertTier(
        alert({
          event: 'Severe Thunderstorm Warning',
          description: '...particularly dangerous situation...',
        }),
      ),
    ).toBe('critical')
  })

  it('classifies active warnings as high', () => {
    expect(classifySevereAlertTier(alert({ event: 'Tornado Warning' }))).toBe('high')
    expect(classifySevereAlertTier(alert({ event: 'Flash Flood Warning' }))).toBe('high')
  })

  it('classifies watches as standard', () => {
    expect(classifySevereAlertTier(alert({ event: 'Tornado Watch' }))).toBe('standard')
  })

  it('emails only high and critical tiers', () => {
    expect(shouldEmailSevereAlertTier('critical')).toBe(true)
    expect(shouldEmailSevereAlertTier('high')).toBe(true)
    expect(shouldEmailSevereAlertTier('standard')).toBe(false)
  })
})
