/** @jest-environment node */

import { runSevereAlertMonitor } from '@/lib/services/severe-alert-monitor'
import { fetchHarmWarningAlerts } from '@/lib/services/nws-alerts-service'

jest.mock('@/lib/services/nws-alerts-service', () => ({
  fetchHarmWarningAlerts: jest.fn(),
}))

jest.mock('@/lib/services/severe-alert-subscriptions', () => ({
  fetchEnabledSevereSubscriptions: jest.fn(),
}))

const mockFetchAlerts = fetchHarmWarningAlerts as jest.Mock
const { fetchEnabledSevereSubscriptions } = jest.requireMock(
  '@/lib/services/severe-alert-subscriptions',
)

const DENVER_POLYGON = {
  type: 'Polygon',
  coordinates: [
    [
      [-105.2, 39.6],
      [-104.7, 39.6],
      [-104.7, 39.9],
      [-105.2, 39.9],
      [-105.2, 39.6],
    ],
  ],
}

const denverSub = {
  id: 'sub-1',
  user_id: 'user-1',
  saved_location_id: 'loc-1',
  latitude: 39.74,
  longitude: -104.99,
  locationLabel: 'Denver, CO',
}

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
    fetchEnabledSevereSubscriptions.mockResolvedValue([denverSub])
  })

  it('creates in-app alerts when a harm warning polygon covers a saved pin', async () => {
    mockFetchAlerts.mockResolvedValue([
      {
        id: 'alert-1',
        event: 'Tornado Warning',
        headline: 'Tornado Warning for Denver',
        instruction: 'Take shelter now.',
        severity: 'Extreme',
        urgency: 'Immediate',
        expires: '2026-07-04T00:00:00Z',
        areaDesc: 'Denver CO',
        geometry: DENVER_POLYGON,
      },
    ])

    const state: Record<string, string[]> = {}
    const inserts: unknown[] = []
    const supabase = makeSupabaseMock(state, inserts)

    const result = await runSevereAlertMonitor(supabase as never)

    expect(mockFetchAlerts).toHaveBeenCalledTimes(1)
    expect(result.newAlerts).toBe(1)
    expect(inserts).toHaveLength(1)
    expect(inserts[0]).toMatchObject({
      user_id: 'user-1',
      kind: 'severe_weather',
      payload: expect.objectContaining({
        alertId: 'alert-1',
        instruction: 'Take shelter now.',
        warningsHref: '/warnings?alert=alert-1',
      }),
    })
    expect(state['sub-1']).toEqual(['alert-1'])
  })

  it('does not page a pin outside the warning polygon', async () => {
    mockFetchAlerts.mockResolvedValue([
      {
        id: 'alert-1',
        event: 'Tornado Warning',
        headline: 'Tornado Warning for Dallas',
        severity: 'Extreme',
        urgency: 'Immediate',
        expires: '2026-07-04T00:00:00Z',
        areaDesc: 'Dallas TX',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [-97.0, 32.6],
              [-96.6, 32.6],
              [-96.6, 32.9],
              [-97.0, 32.9],
              [-97.0, 32.6],
            ],
          ],
        },
      },
    ])

    const state: Record<string, string[]> = {}
    const inserts: unknown[] = []
    const result = await runSevereAlertMonitor(makeSupabaseMock(state, inserts) as never)

    expect(result.newAlerts).toBe(0)
    expect(inserts).toHaveLength(0)
    expect(state['sub-1']).toEqual([])
  })

  it('does not treat missing geometry as coverage', async () => {
    mockFetchAlerts.mockResolvedValue([
      {
        id: 'alert-1',
        event: 'Tornado Warning',
        headline: 'Tornado Warning',
        severity: 'Extreme',
        urgency: 'Immediate',
        expires: '2026-07-04T00:00:00Z',
        areaDesc: 'Denver CO',
        geometry: null,
      },
    ])

    const inserts: unknown[] = []
    const result = await runSevereAlertMonitor(makeSupabaseMock({}, inserts) as never)

    expect(result.newAlerts).toBe(0)
    expect(inserts).toHaveLength(0)
  })

  it('does not send all-clear when a warning expires', async () => {
    mockFetchAlerts.mockResolvedValue([])

    const state: Record<string, string[]> = { 'sub-1': ['alert-1'] }
    const inserts: unknown[] = []
    const onNewAlert = jest.fn()

    const result = await runSevereAlertMonitor(makeSupabaseMock(state, inserts) as never, {
      onNewAlert,
    })

    expect(result.allClears).toBe(0)
    expect(result.newAlerts).toBe(0)
    expect(inserts).toHaveLength(0)
    expect(onNewAlert).not.toHaveBeenCalled()
    expect(state['sub-1']).toEqual([])
  })

  it('leaves monitor state unchanged when the national fetch fails', async () => {
    mockFetchAlerts.mockRejectedValue(new Error('NWS down'))

    const state: Record<string, string[]> = { 'sub-1': ['alert-1'] }
    const inserts: unknown[] = []

    const result = await runSevereAlertMonitor(makeSupabaseMock(state, inserts) as never)

    expect(result.newAlerts).toBe(0)
    expect(result.errors).toEqual(['national: NWS down'])
    expect(inserts).toHaveLength(0)
    expect(state['sub-1']).toEqual(['alert-1'])
  })

  it('skips duplicate alerts already tracked in monitor state', async () => {
    mockFetchAlerts.mockResolvedValue([
      {
        id: 'alert-1',
        event: 'Tornado Warning',
        headline: 'Tornado Warning for Denver',
        severity: 'Extreme',
        urgency: 'Immediate',
        expires: '2026-07-04T00:00:00Z',
        areaDesc: 'Denver CO',
        geometry: DENVER_POLYGON,
      },
    ])

    const state: Record<string, string[]> = { 'sub-1': ['alert-1'] }
    const inserts: unknown[] = []
    const result = await runSevereAlertMonitor(makeSupabaseMock(state, inserts) as never)

    expect(result.newAlerts).toBe(0)
    expect(inserts).toHaveLength(0)
  })
})
