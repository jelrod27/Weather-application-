import { parseUserAlert } from '@/lib/services/user-alerts-utils'
import type { UserAlert } from '@/lib/supabase/types'

describe('user-alerts-utils', () => {
  it('parses severe weather alerts with warnings deep link', () => {
    const row: UserAlert = {
      id: 'ua-1',
      user_id: 'user-1',
      subscription_id: 'sub-1',
      kind: 'severe_weather',
      payload: {
        alertId: 'alert-1',
        event: 'Tornado Warning',
        headline: 'Tornado Warning for Denver CO',
        severity: 'Extreme',
        urgency: 'Immediate',
        expires: '2026-07-04T00:00:00Z',
        areaDesc: 'Denver CO',
        locationName: 'Denver, CO',
        savedLocationId: 'loc-1',
        warningsHref: '/warnings?alert=alert-1',
        tier: 'critical',
      },
      email_sent_at: null,
      created_at: '2026-07-03T12:00:00Z',
      read_at: null,
    }

    expect(parseUserAlert(row)).toMatchObject({
      title: 'Tornado Warning',
      href: '/warnings?alert=alert-1',
      tier: 'critical',
    })
  })

  it('parses all-clear alerts', () => {
    const row: UserAlert = {
      id: 'ua-2',
      user_id: 'user-1',
      subscription_id: 'sub-1',
      kind: 'severe_weather_all_clear',
      payload: {
        locationName: 'Denver, CO',
        savedLocationId: 'loc-1',
        clearedAlertIds: ['alert-1'],
        warningsHref: '/warnings',
      },
      email_sent_at: '2026-07-03T13:00:00Z',
      created_at: '2026-07-03T13:00:00Z',
      read_at: null,
    }

    expect(parseUserAlert(row)).toMatchObject({
      title: 'All clear',
      href: '/warnings',
    })
  })
})
