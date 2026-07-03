/** @jest-environment node */

import { runSevereAlertMonitor } from '@/lib/services/severe-alert-monitor'
import { fetchActiveAlertsDetail } from '@/lib/services/nws-alerts-service'

jest.mock('@/lib/services/nws-alerts-service', () => ({
  fetchActiveAlertsDetail: jest.fn(),
}))

jest.mock('@/lib/services/severe-alert-subscriptions', () => ({
  fetchEnabledSevereSubscriptions: jest.fn(),
}))

const mockFetchAlerts = fetchActiveAlertsDetail as jest.Mock
const { fetchEnabledSevereSubscriptions } = jest.requireMock(
  '@/lib/services/severe-alert-subscriptions',
)

function makeSupabaseMock(state: Record<string, string[]>, inserts: unknown[]) {
  return {
    from: (table: string) => {
      if (table === 'alert_monitor_state') {
        return {
          select: () => ({
            eq: (_col: string, subscriptionId: string) => ({
              maybeSingle: async () => ({
                data: state[subscriptionId]
                  ? { active_alert_ids: state[subscriptionId] }
                  : null,
                error: null,
              }),
            }),
          }),
          upsert: async (row: { subscription_id: string; active_alert_ids: string[] }) => {
            state[row.subscription_id] = row.active_alert_ids
            return { error: null }
          },
        }
      }

      if (table === 'user_alerts') {
        return {
          insert: (row: unknown) => ({
            select: () => ({
              single: async () => {
                inserts.push(row)
                return { data: { id: `alert-row-${inserts.length}` }, error: null }
              },
            }),
          }),
        }
      }

      throw new Error(`Unexpected table ${table}`)
    },
  }
}

describe('runSevereAlertMonitor', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('creates in-app alerts for newly active NWS products', async () => {
    fetchEnabledSevereSubscriptions.mockResolvedValue([
      {
        id: 'sub-1',
        user_id: 'user-1',
        saved_location_id: 'loc-1',
        latitude: 39.74,
        longitude: -104.99,
        locationLabel: 'Denver, CO',
      },
    ])

    mockFetchAlerts.mockResolvedValue([
      {
        id: 'alert-1',
        event: 'Tornado Warning',
        headline: 'Tornado Warning for Denver',
        severity: 'Extreme',
        urgency: 'Immediate',
        expires: '2026-07-04T00:00:00Z',
        areaDesc: 'Denver CO',
      },
    ])

    const state: Record<string, string[]> = {}
    const inserts: unknown[] = []
    const supabase = makeSupabaseMock(state, inserts)

    const result = await runSevereAlertMonitor(supabase as never)

    expect(result.newAlerts).toBe(1)
    expect(inserts).toHaveLength(1)
    expect(inserts[0]).toMatchObject({
      user_id: 'user-1',
      kind: 'severe_weather',
      payload: expect.objectContaining({
        alertId: 'alert-1',
        warningsHref: '/warnings?alert=alert-1',
      }),
    })
    expect(state['sub-1']).toEqual(['alert-1'])
  })

  it('creates all-clear alerts when severe products expire for a location', async () => {
    fetchEnabledSevereSubscriptions.mockResolvedValue([
      {
        id: 'sub-1',
        user_id: 'user-1',
        saved_location_id: 'loc-1',
        latitude: 39.74,
        longitude: -104.99,
        locationLabel: 'Denver, CO',
      },
    ])

    mockFetchAlerts.mockResolvedValue([])

    const state: Record<string, string[]> = { 'sub-1': ['alert-1'] }
    const inserts: unknown[] = []
    const supabase = makeSupabaseMock(state, inserts)
    const onAllClear = jest.fn()

    const result = await runSevereAlertMonitor(supabase as never, { onAllClear })

    expect(result.allClears).toBe(1)
    expect(inserts[0]).toMatchObject({ kind: 'severe_weather_all_clear' })
    expect(onAllClear).toHaveBeenCalledTimes(1)
    expect(state['sub-1']).toEqual([])
  })

  it('skips duplicate alerts already tracked in monitor state', async () => {
    fetchEnabledSevereSubscriptions.mockResolvedValue([
      {
        id: 'sub-1',
        user_id: 'user-1',
        saved_location_id: 'loc-1',
        latitude: 39.74,
        longitude: -104.99,
        locationLabel: 'Denver, CO',
      },
    ])

    mockFetchAlerts.mockResolvedValue([
      {
        id: 'alert-1',
        event: 'Tornado Warning',
        headline: 'Tornado Warning for Denver',
        severity: 'Extreme',
        urgency: 'Immediate',
        expires: '2026-07-04T00:00:00Z',
        areaDesc: 'Denver CO',
      },
    ])

    const state: Record<string, string[]> = { 'sub-1': ['alert-1'] }
    const inserts: unknown[] = []
    const supabase = makeSupabaseMock(state, inserts)

    const result = await runSevereAlertMonitor(supabase as never)

    expect(result.newAlerts).toBe(0)
    expect(inserts).toHaveLength(0)
  })
})
