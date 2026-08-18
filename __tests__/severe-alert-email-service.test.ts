jest.mock('resend', () => ({
  Resend: jest.fn(),
}))

jest.mock('@/lib/services/resend-client', () => ({
  getResendFromConfig: jest.fn(),
}))

import { buildSevereAlertEmailContent } from '@/lib/services/severe-alert-email-service'

describe('severe-alert-email-service', () => {
  it('builds subject and warnings deep link from payload', () => {
    const { subject, text, html } = buildSevereAlertEmailContent({
      alertId: 'urn:oid:1',
      event: 'Tornado Warning',
      headline: 'Tornado Warning issued for Denver CO',
      severity: 'Extreme',
      urgency: 'Immediate',
      expires: '2026-07-04T01:00:00Z',
      areaDesc: 'Denver CO',
      locationName: 'Denver, CO',
      savedLocationId: 'loc-1',
      warningsHref: '/warnings/urn%3Aoid%3A1',
      instruction: 'Take shelter now.\nStay away from windows.',
    })

    expect(subject).toBe('Tornado Warning — Denver, CO')
    expect(text).toContain('/warnings/')
    expect(text).toContain('Take shelter now.\nStay away from windows.')
    expect(text).toContain('does not replace Wireless Emergency Alerts')
    expect(text).toContain('Manage or unsubscribe')
    expect(html).toContain('Open warnings command center')
    expect(html).toContain('Take shelter now.<br />Stay away from windows.')
  })

  it('says warning ended without calling it an all-clear', () => {
    const { subject, text } = buildSevereAlertEmailContent({
      alertId: 'alert-1#ended',
      event: 'Tornado Warning',
      headline: 'A National Weather Service Tornado Warning ended or no longer covers Denver, CO.',
      severity: 'Extreme',
      urgency: 'Immediate',
      expires: '2026-07-04T01:00:00Z',
      areaDesc: 'Denver CO',
      locationName: 'Denver, CO',
      savedLocationId: 'loc-1',
      warningsHref: '/warnings/alert-1',
      phase: 'ended',
      instruction:
        'This National Weather Service warning ended or no longer covers your pin. That is not an all-clear. Stay alert and follow local officials, Wireless Emergency Alerts, and NOAA Weather Radio.',
    })

    expect(subject).toBe('Warning ended — Denver, CO')
    expect(text.toLowerCase()).toContain('not an all-clear')
    expect(text.toLowerCase()).not.toContain('all-clear for')
  })

  it('labels Scout mail as unofficial', () => {
    const { subject, text } = buildSevereAlertEmailContent({
      alertId: 'id#scout',
      event: 'Bitwatch Scout',
      headline: 'Unofficial: a Severe Thunderstorm Warning cell may approach Denver, CO in about 30 minutes.',
      severity: 'Severe',
      urgency: 'Immediate',
      expires: '2026-07-04T01:00:00Z',
      areaDesc: 'Jefferson CO',
      locationName: 'Denver, CO',
      savedLocationId: 'loc-1',
      warningsHref: '/warnings/id',
      phase: 'scout',
      instruction:
        'Bitwatch Scout inferred an unofficial approaching storm from NWS cell motion (TIME...MOT...LOC) and optional nowcast rain. This is not a National Weather Service warning for your pin. It does not replace Wireless Emergency Alerts, NOAA Weather Radio, or local officials.',
    })
    expect(subject).toBe('Bitwatch Scout — Denver, CO')
    expect(text.toLowerCase()).toContain('unofficial')
    expect(text.toLowerCase()).toContain('not a national weather service warning')
  })

  it('escapes HTML in email body fields', () => {
    const { html } = buildSevereAlertEmailContent({
      alertId: 'urn:oid:1',
      event: 'Tornado Warning <script>',
      headline: 'Headline & "quotes"',
      severity: 'Extreme',
      urgency: 'Immediate',
      expires: '2026-07-04T01:00:00Z',
      areaDesc: 'Denver <b>CO</b>',
      locationName: 'Denver, CO',
      savedLocationId: 'loc-1',
      warningsHref: '/warnings',
    })

    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
    expect(html).toContain('&amp;')
    expect(html).toContain('&quot;quotes&quot;')
  })
})
