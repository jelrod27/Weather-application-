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
      warningsHref: '/warnings?alert=urn%3Aoid%3A1',
      instruction: 'Take shelter now.\nStay away from windows.',
    })

    expect(subject).toBe('Tornado Warning — Denver, CO')
    expect(text).toContain('/warnings?alert=')
    expect(text).toContain('Take shelter now.\nStay away from windows.')
    expect(text).toContain('does not replace Wireless Emergency Alerts')
    expect(html).toContain('Open warnings command center')
    expect(html).toContain('Take shelter now.<br />Stay away from windows.')
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
