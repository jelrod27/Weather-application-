/** @jest-environment node */

import { runSevereAlertMonitor } from '@/lib/services/severe-alert-monitor'
import { fetchActiveAlertsDetail, fetchHarmWarningAlerts } from '@/lib/services/nws-alerts-service'
import { loadCanonicalActiveAlerts, loadCanonicalAlertBySlug } from '@/lib/bitwatch/ingest'

jest.mock('@/lib/services/nws-alerts-service', () => ({
  fetchHarmWarningAlerts: jest.fn(),
  fetchActiveAlertsDetail: jest.fn(),
}))

jest.mock('@/lib/bitwatch/ingest', () => ({
  loadCanonicalActiveAlerts: jest.fn(),
  loadCanonicalAlertBySlug: jest.fn(),
}))

jest.mock('@/lib/bitwatch/scout-nowcast', () => ({
  pinNowcastIsWet: jest.fn().mockResolvedValue(false),
}))

jest.mock('@/lib/services/severe-alert-subscriptions', () => ({
  fetchEnabledSevereSubscriptions: jest.fn(),
}))

jest.mock('@/lib/services/guest-alert-subscribers', () => ({
  fetchEnabledGuestSubscribers: jest.fn().mockResolvedValue([]),
}))

const mockFetchAlerts = fetchHarmWarningAlerts as jest.Mock
const mockPointFetch = fetchActiveAlertsDetail as jest.Mock
const mockCanonical = loadCanonicalActiveAlerts as jest.Mock
const mockCanonicalBySlug = loadCanonicalAlertBySlug as jest.Mock
const { fetchEnabledSevereSubscriptions } = jest.requireMock(
  '@/lib/services/severe-alert-subscriptions',
)
const { fetchEnabledGuestSubscribers } = jest.requireMock(
  '@/lib/services/guest-alert-subscribers',
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

function makeSupabaseMock(
  state: Record<string, string[]>,
  inserts: unknown[],
  options?: { insertError?: { code: string } },
) {
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
                if (options?.insertError) {
                  return { data: null, error: options.insertError }
                }
                return { data: { id: `alert-row-${inserts.length}` }, error: null }
              },
            }),
          }),
        }
      }

      if (table === 'guest_alert_monitor_state') {
        return {
          select: () => ({
            eq: (_col: string, subscriberId: string) => ({
              maybeSingle: async () => ({
                data: state[subscriberId]
                  ? { active_alert_ids: state[subscriberId] }
                  : null,
                error: null,
              }),
            }),
          }),
          upsert: async (row: { subscriber_id: string; active_alert_ids: string[] }) => {
            state[row.subscriber_id] = row.active_alert_ids
            return { error: null }
          },
        }
      }

      if (table === 'guest_alert_deliveries') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: null, error: null }),
            }),
          }),
          insert: () => ({
            select: () => ({
              single: async () => ({ data: { id: 'guest-delivery' }, error: null }),
            }),
          }),
        }
      }

      if (table === 'bitwatch_deliveries') {
        return {
          insert: () => ({
            select: () => ({
              single: async () => ({ data: { id: `outbox-${Date.now()}` }, error: null }),
            }),
          }),
          update: () => ({
            eq: async () => ({ error: null }),
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
    fetchEnabledGuestSubscribers.mockResolvedValue([])
    mockCanonical.mockResolvedValue(null)
    mockCanonicalBySlug.mockResolvedValue(null)
    mockPointFetch.mockResolvedValue([])
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
        warningsHref: '/warnings/alert-1',
        phase: 'new',
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

    expect(mockPointFetch).toHaveBeenCalled()
    expect(result.newAlerts).toBe(0)
    expect(inserts).toHaveLength(0)
  })

  it('covers a pin via the NWS point-active feed when geometry is null', async () => {
    mockFetchAlerts.mockResolvedValue([
      {
        id: 'alert-1',
        warningEventId: 'KLWX.TO.W.0023.2026',
        event: 'Tornado Warning',
        headline: 'Tornado Warning',
        severity: 'Extreme',
        urgency: 'Immediate',
        expires: '2026-07-04T00:00:00Z',
        areaDesc: 'Denver CO',
        geometry: null,
      },
    ])
    mockPointFetch.mockResolvedValue([
      { id: 'alert-1', warningEventId: 'KLWX.TO.W.0023.2026' },
    ])

    const inserts: unknown[] = []
    const result = await runSevereAlertMonitor(makeSupabaseMock({}, inserts) as never)

    expect(result.newAlerts).toBe(1)
    expect(inserts[0]).toMatchObject({
      payload: expect.objectContaining({
        alertId: 'KLWX.TO.W.0023.2026',
        warningEventId: 'KLWX.TO.W.0023.2026',
      }),
    })
  })

  it('does not treat a VTEC CON as a new Warning Event', async () => {
    mockFetchAlerts.mockResolvedValue([
      {
        id: 'nws-con-2',
        warningEventId: 'KOAX.TO.W.0045.2026',
        event: 'Tornado Warning',
        headline: 'Tornado Warning continued',
        severity: 'Extreme',
        urgency: 'Immediate',
        expires: '2026-07-04T00:00:00Z',
        areaDesc: 'Denver CO',
        geometry: DENVER_POLYGON,
      },
    ])

    const state: Record<string, string[]> = { 'sub-1': ['KOAX.TO.W.0045.2026'] }
    const inserts: unknown[] = []
    const result = await runSevereAlertMonitor(makeSupabaseMock(state, inserts) as never)

    expect(result.newAlerts).toBe(0)
    expect(inserts).toHaveLength(0)
  })

  it('pages an IBW upgrade on a Warning Event already covering the pin', async () => {
    mockFetchAlerts.mockResolvedValue([
      {
        id: 'nws-con-2',
        warningEventId: 'KOAX.SV.W.0100.2026',
        event: 'Severe Thunderstorm Warning',
        headline: 'Destructive thunderstorm',
        severity: 'Severe',
        urgency: 'Immediate',
        expires: '2026-07-04T00:00:00Z',
        areaDesc: 'Denver CO',
        geometry: DENVER_POLYGON,
        hazard: { maxHail: null, maxWind: null, source: null, damageThreat: 'destructive' },
      },
    ])

    const state: Record<string, string[]> = { 'sub-1': ['KOAX.SV.W.0100.2026'] }
    const inserts: unknown[] = []
    const onNewAlert = jest.fn()
    const result = await runSevereAlertMonitor(makeSupabaseMock(state, inserts) as never, {
      onNewAlert,
    })

    expect(result.newAlerts).toBe(1)
    expect(inserts[0]).toMatchObject({
      payload: expect.objectContaining({
        alertId: 'KOAX.SV.W.0100.2026#upgrade',
        phase: 'upgrade',
      }),
    })
    expect(onNewAlert).toHaveBeenCalledTimes(1)
  })

  it('does not send all-clear when a warning expires; it sends ended wording instead', async () => {
    mockFetchAlerts.mockResolvedValue([])

    const state: Record<string, string[]> = { 'sub-1': ['alert-1'] }
    const inserts: unknown[] = []
    const onNewAlert = jest.fn()

    const result = await runSevereAlertMonitor(makeSupabaseMock(state, inserts) as never, {
      onNewAlert,
    })

    expect(result.allClears).toBe(0)
    expect(result.newAlerts).toBe(0)
    expect(result.endedAlerts).toBe(1)
    expect(inserts).toHaveLength(1)
    expect(inserts[0]).toMatchObject({
      payload: expect.objectContaining({
        alertId: 'alert-1#ended',
        phase: 'ended',
        instruction: expect.stringContaining('not an all-clear'),
      }),
    })
    expect(onNewAlert).toHaveBeenCalledTimes(1)
    expect(state['sub-1']).toEqual([])
  })

  it('leaves monitor state unchanged when the national fetch fails', async () => {
    mockFetchAlerts.mockRejectedValue(new Error('NWS down'))

    const state: Record<string, string[]> = { 'sub-1': ['alert-1'] }
    const inserts: unknown[] = []

    const result = await runSevereAlertMonitor(makeSupabaseMock(state, inserts) as never)

    expect(result.newAlerts).toBe(0)
    expect(result.endedAlerts).toBe(0)
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

  it('treats a unique-violation insert as already paged', async () => {
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

    const state: Record<string, string[]> = {}
    const inserts: unknown[] = []
    const onNewAlert = jest.fn()
    const result = await runSevereAlertMonitor(
      makeSupabaseMock(state, inserts, { insertError: { code: '23505' } }) as never,
      { onNewAlert },
    )

    expect(result.newAlerts).toBe(0)
    expect(onNewAlert).not.toHaveBeenCalled()
    expect(state['sub-1']).toEqual(['alert-1'])
  })

  it('skips a tornado Delivery when the tornado toggle is off', async () => {
    fetchEnabledSevereSubscriptions.mockResolvedValue([
      { ...denverSub, notifyTornado: false },
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
        geometry: DENVER_POLYGON,
      },
    ])

    const inserts: unknown[] = []
    const result = await runSevereAlertMonitor(makeSupabaseMock({}, inserts) as never)

    expect(result.newAlerts).toBe(0)
    expect(inserts).toHaveLength(0)
  })

  it('pages an unofficial Scout approach and never labels it as an NWS warning on the pin', async () => {
    mockFetchAlerts.mockResolvedValue([
      {
        id: 'svr-west',
        warningEventId: 'KBOU.SV.W.0099.2026',
        event: 'Severe Thunderstorm Warning',
        headline: 'Severe Thunderstorm Warning west of Denver',
        severity: 'Severe',
        urgency: 'Immediate',
        expires: '2026-07-04T00:00:00Z',
        areaDesc: 'Jefferson CO',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [-105.6, 39.6],
              [-105.3, 39.6],
              [-105.3, 39.9],
              [-105.6, 39.9],
              [-105.6, 39.6],
            ],
          ],
        },
        motion: {
          timeZ: '0100Z',
          headingDeg: 90,
          speedKt: 50,
          lat: 39.74,
          lon: -105.4,
        },
      },
    ])

    const inserts: unknown[] = []
    const onNewAlert = jest.fn()
    const result = await runSevereAlertMonitor(makeSupabaseMock({}, inserts) as never, { onNewAlert })

    expect(result.newAlerts).toBe(0)
    expect(result.scoutAlerts).toBe(1)
    expect(inserts[0]).toMatchObject({
      payload: expect.objectContaining({
        event: 'Bitwatch Scout',
        phase: 'scout',
        instruction: expect.stringContaining('not a National Weather Service warning'),
      }),
    })
    expect(onNewAlert).toHaveBeenCalledTimes(1)
  })

  it('does not Scout when an official warning already covers the pin', async () => {
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
        motion: {
          timeZ: '0100Z',
          headingDeg: 90,
          speedKt: 50,
          lat: 39.74,
          lon: -105.4,
        },
      },
    ])

    const inserts: unknown[] = []
    const result = await runSevereAlertMonitor(makeSupabaseMock({}, inserts) as never)
    expect(result.scoutAlerts).toBe(0)
    expect(result.newAlerts).toBe(1)
  })

  it('does not use delayed canonical alerts as the live national snapshot', async () => {
    mockCanonical.mockResolvedValue({
      freshness: 'delayed',
      alerts: [],
      observedAt: '2026-07-04T00:00:00Z',
    })
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

    const inserts: unknown[] = []
    const result = await runSevereAlertMonitor(makeSupabaseMock({}, inserts) as never)

    expect(mockFetchAlerts).toHaveBeenCalledTimes(1)
    expect(result.newAlerts).toBe(1)
  })

  it('pages an ended warning once when monitor state stored both VTEC and NWS ids', async () => {
    mockFetchAlerts.mockResolvedValue([])
    mockCanonicalBySlug.mockResolvedValue({
      id: 'nws-1',
      warningEventId: 'KOAX.SV.W.0100.2026',
      event: 'Severe Thunderstorm Warning',
      headline: 'Severe Thunderstorm Warning',
      instruction: 'Take shelter.',
      severity: 'Severe',
      urgency: 'Immediate',
      expires: '2026-07-04T00:00:00Z',
      areaDesc: 'Denver CO',
      geometry: DENVER_POLYGON,
    })

    const state: Record<string, string[]> = {
      'sub-1': ['KOAX.SV.W.0100.2026', 'nws-1'],
    }
    const inserts: unknown[] = []
    const result = await runSevereAlertMonitor(makeSupabaseMock(state, inserts) as never)

    expect(result.endedAlerts).toBe(1)
    expect(inserts).toHaveLength(1)
  })

  it('does not send guest ended Delivery while the same warning still covers the pin', async () => {
    fetchEnabledSevereSubscriptions.mockResolvedValue([])
    fetchEnabledGuestSubscribers.mockResolvedValue([
      {
        id: 'guest-1',
        email: 'guest@example.com',
        latitude: 39.74,
        longitude: -104.99,
        locationLabel: 'Denver, CO',
        enabled: true,
        verifiedAt: '2026-07-04T00:00:00Z',
        notifyTornado: true,
        notifySevereThunderstorm: true,
        notifyFlashFlood: true,
        notifyUpgrades: true,
      },
    ])
    mockFetchAlerts.mockResolvedValue([
      {
        id: 'nws-con-2',
        warningEventId: 'KOAX.SV.W.0100.2026',
        event: 'Severe Thunderstorm Warning',
        headline: 'Severe Thunderstorm Warning',
        severity: 'Severe',
        urgency: 'Immediate',
        expires: '2026-07-04T00:00:00Z',
        areaDesc: 'Denver CO',
        geometry: DENVER_POLYGON,
      },
    ])

    const state: Record<string, string[]> = {
      'guest-1': ['KOAX.SV.W.0100.2026', 'old-nws-id'],
    }
    const inserts: unknown[] = []
    mockCanonicalBySlug.mockResolvedValue({
      id: 'old-nws-id',
      warningEventId: 'KOAX.SV.W.0100.2026',
      event: 'Severe Thunderstorm Warning',
      headline: 'Severe Thunderstorm Warning',
      severity: 'Severe',
      urgency: 'Immediate',
      expires: '2026-07-04T00:00:00Z',
      areaDesc: 'Denver CO',
      geometry: DENVER_POLYGON,
    })

    const result = await runSevereAlertMonitor(makeSupabaseMock(state, inserts) as never)

    expect(result.guestEndedAlerts).toBe(0)
    expect(inserts).toHaveLength(0)
  })

  it('still sends ended wording after the hazard toggle is turned off', async () => {
    fetchEnabledSevereSubscriptions.mockResolvedValue([
      { ...denverSub, notifyTornado: false },
    ])
    mockFetchAlerts.mockResolvedValue([])
    mockCanonicalBySlug.mockResolvedValue({
      id: 'alert-1',
      warningEventId: 'KLWX.TO.W.0023.2026',
      event: 'Tornado Warning',
      headline: 'Tornado Warning for Denver',
      instruction: 'Take shelter now.',
      severity: 'Extreme',
      urgency: 'Immediate',
      expires: '2026-07-04T00:00:00Z',
      areaDesc: 'Denver CO',
      geometry: DENVER_POLYGON,
    })

    const state: Record<string, string[]> = { 'sub-1': ['alert-1'] }
    const inserts: unknown[] = []
    const result = await runSevereAlertMonitor(makeSupabaseMock(state, inserts) as never)

    expect(result.endedAlerts).toBe(1)
    expect(inserts[0]).toMatchObject({
      payload: expect.objectContaining({
        phase: 'ended',
        instruction: expect.stringContaining('not an all-clear'),
      }),
    })
  })

  it('does not Scout a severe cell when the severe thunderstorm toggle is off', async () => {
    fetchEnabledSevereSubscriptions.mockResolvedValue([
      { ...denverSub, notifySevereThunderstorm: false },
    ])
    mockFetchAlerts.mockResolvedValue([
      {
        id: 'svr-west',
        warningEventId: 'KBOU.SV.W.0099.2026',
        event: 'Severe Thunderstorm Warning',
        headline: 'Severe Thunderstorm Warning west of Denver',
        severity: 'Severe',
        urgency: 'Immediate',
        expires: '2026-07-04T00:00:00Z',
        areaDesc: 'Jefferson CO',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [-105.6, 39.6],
              [-105.3, 39.6],
              [-105.3, 39.9],
              [-105.6, 39.9],
              [-105.6, 39.6],
            ],
          ],
        },
        motion: {
          timeZ: '0100Z',
          headingDeg: 90,
          speedKt: 50,
          lat: 39.74,
          lon: -105.4,
        },
      },
    ])

    const inserts: unknown[] = []
    const result = await runSevereAlertMonitor(makeSupabaseMock({}, inserts) as never)
    expect(result.scoutAlerts).toBe(0)
    expect(inserts).toHaveLength(0)
  })
})
