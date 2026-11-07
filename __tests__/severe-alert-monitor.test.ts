/** @jest-environment node */

import { runSevereAlertMonitor } from '@/lib/services/severe-alert-monitor'
import { SEVERE_MONITOR_CONCURRENCY } from '@/lib/services/severe-alert-monitor-concurrency'
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
  options?: { insertError?: { code: string }; stateReads?: string[]; readFailureIds?: string[]; writeFailureIds?: string[] },
) {
  return {
    from: (table: string) => {
      if (table === 'alert_monitor_state') {
        return {
          select: () => {
            options?.stateReads?.push(table)
            return {
              in: async (_col: string, ids: string[]) => ({
                data: ids.filter((id) => state[id]).map((id) => ({ subscription_id: id, active_alert_ids: state[id] })),
                error: ids.some((id) => options?.readFailureIds?.includes(id)) ? { message: 'state unavailable' } : null,
              }),
            }
          },
          upsert: async (row: { subscription_id: string; active_alert_ids: string[] }) => {
            if (options?.writeFailureIds?.includes(row.subscription_id)) return { error: { message: 'write unavailable' } }
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
          select: () => {
            options?.stateReads?.push(table)
            return {
              in: async (_col: string, ids: string[]) => ({
                data: ids.filter((id) => state[id]).map((id) => ({ subscriber_id: id, active_alert_ids: state[id] })),
                error: ids.some((id) => options?.readFailureIds?.includes(id)) ? { message: 'state unavailable' } : null,
              }),
            }
          },
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

  it('loads prior state once per account batch while preserving new-alert delivery and repeated-run deduplication', async () => {
    const subs = Array.from({ length: 3 }, (_, i) => ({ ...denverSub, id: `batch-${i}`, user_id: `user-${i}` }))
    fetchEnabledSevereSubscriptions.mockResolvedValue(subs)
    mockFetchAlerts.mockResolvedValue([{
      id: 'batch-warning', event: 'Tornado Warning', headline: 'Take shelter',
      severity: 'Extreme', urgency: 'Immediate', geometry: DENVER_POLYGON,
    }])
    const state: Record<string, string[]> = { 'batch-0': ['batch-warning'] }
    const inserts: unknown[] = []
    const reads: string[] = []
    const onNewAlert = jest.fn()
    const supabase = makeSupabaseMock(state, inserts, { stateReads: reads })
    const first = await runSevereAlertMonitor(supabase as never, { onNewAlert })
    expect(first.errors).toEqual([])
    expect(first.newAlerts).toBe(2)
    expect(onNewAlert).toHaveBeenCalledTimes(2)
    expect(reads).toEqual(['alert_monitor_state'])
    const second = await runSevereAlertMonitor(supabase as never, { onNewAlert })
    expect(second.errors).toEqual([])
    expect(second.newAlerts).toBe(0)
    expect(onNewAlert).toHaveBeenCalledTimes(2)
    expect(inserts).toHaveLength(2)
  })

  it('skips an unreadable account batch without changing its history and still delivers to later accounts and guests', async () => {
    const subs = Array.from({ length: 101 }, (_, i) => ({ ...denverSub, id: `failure-${i}`, user_id: `user-${i}` }))
    fetchEnabledSevereSubscriptions.mockResolvedValue(subs)
    const guests = Array.from({ length: 3 }, (_, i) => ({ ...denverSub, id: `guest-batch-${i}`, email: 'guest@example.com' }))
    fetchEnabledGuestSubscribers.mockResolvedValue(guests)
    mockFetchAlerts.mockResolvedValue([{
      id: 'batch-warning', event: 'Tornado Warning', headline: 'Take shelter',
      severity: 'Extreme', urgency: 'Immediate', geometry: DENVER_POLYGON,
    }])
    const state: Record<string, string[]> = { 'failure-0': ['older-warning'], 'guest-batch-0': ['batch-warning'] }
    const inserts: unknown[] = []
    const reads: string[] = []
    const onNewAlert = jest.fn()
    const onNewGuestAlert = jest.fn()
    const supabase = makeSupabaseMock(state, inserts, { stateReads: reads, readFailureIds: ['failure-0'] })
    const result = await runSevereAlertMonitor(supabase as never, { onNewAlert, onNewGuestAlert })
    expect(result.errors).toHaveLength(100)
    expect(result.errors).toContain('failure-0: Monitor state read failed: state unavailable')
    expect(result.newAlerts).toBe(1)
    expect(result.guestNewAlerts).toBe(2)
    expect(result.endedAlerts).toBe(0)
    expect(onNewAlert).toHaveBeenCalledTimes(1)
    expect(onNewAlert.mock.calls[0][0].subscription.id).toBe('failure-100')
    expect(onNewGuestAlert).toHaveBeenCalledTimes(2)
    expect(state['failure-0']).toEqual(['older-warning'])
    expect(state['failure-1']).toBeUndefined()
    expect(state['failure-100']).toContain('batch-warning')
    expect(reads.filter((table) => table === 'alert_monitor_state')).toHaveLength(2)
    expect(reads.filter((table) => table === 'guest_alert_monitor_state')).toHaveLength(1)
    // Subsequent runs must also avoid re-delivering successful places.
    const repeated = await runSevereAlertMonitor(supabase as never, { onNewAlert, onNewGuestAlert })
    expect(repeated.newAlerts).toBe(0)
    expect(repeated.guestNewAlerts).toBe(0)
    expect(onNewAlert).toHaveBeenCalledTimes(1)
    expect(onNewGuestAlert).toHaveBeenCalledTimes(2)
  })

  it('isolates failed guest state reads while delivering account warnings', async () => {
    fetchEnabledGuestSubscribers.mockResolvedValue([{ ...denverSub, id: 'failed-guest', email: 'guest@example.com' }])
    mockFetchAlerts.mockResolvedValue([{
      id: 'account-warning', event: 'Tornado Warning', headline: 'Take shelter',
      severity: 'Extreme', urgency: 'Immediate', geometry: DENVER_POLYGON,
    }])
    const state: Record<string, string[]> = { 'failed-guest': ['previous-warning'] }
    const onNewAlert = jest.fn()
    const onNewGuestAlert = jest.fn()
    const result = await runSevereAlertMonitor(makeSupabaseMock(state, [], { readFailureIds: ['failed-guest'] }) as never, { onNewAlert, onNewGuestAlert })
    expect(result.newAlerts).toBe(1)
    expect(result.guestNewAlerts).toBe(0)
    expect(result.guestEndedAlerts).toBe(0)
    expect(result.errors).toEqual(['guest:failed-guest: Monitor state read failed: state unavailable'])
    expect(onNewAlert).toHaveBeenCalledTimes(1)
    expect(onNewGuestAlert).not.toHaveBeenCalled()
    expect(state['failed-guest']).toEqual(['previous-warning'])
  })

  it('keeps per-place write failures isolated after batching state reads', async () => {
    fetchEnabledSevereSubscriptions.mockResolvedValue([denverSub, { ...denverSub, id: 'healthy-sub' }])
    mockFetchAlerts.mockResolvedValue([])
    const state: Record<string, string[]> = {}
    const result = await runSevereAlertMonitor(makeSupabaseMock(state, [], { writeFailureIds: ['sub-1'] }) as never)
    expect(result.errors).toEqual(['sub-1: Monitor state write failed: write unavailable'])
    expect(state['sub-1']).toBeUndefined()
    expect(state['healthy-sub']).toEqual([])
  })

  it.each(['account', 'guest', 'both'])('reports %s recipient lookup failures while still processing readable recipients', async (failed) => {
    const guest = { ...denverSub, id: 'healthy-guest', email: 'guest@example.com' }
    fetchEnabledGuestSubscribers.mockResolvedValue([guest])
    if (failed !== 'guest') fetchEnabledSevereSubscriptions.mockRejectedValue(new Error('account lookup unavailable'))
    if (failed !== 'account') fetchEnabledGuestSubscribers.mockRejectedValue(new Error('guest lookup unavailable'))
    mockFetchAlerts.mockResolvedValue([{
      id: 'cohort-warning', event: 'Tornado Warning', headline: 'Take shelter',
      severity: 'Extreme', urgency: 'Immediate', geometry: DENVER_POLYGON,
    }])
    const onNewAlert = jest.fn()
    const onNewGuestAlert = jest.fn()
    const result = await runSevereAlertMonitor(makeSupabaseMock({}, []) as never, { onNewAlert, onNewGuestAlert })
    expect(result.errors).toEqual(failed === 'both'
      ? ['subscriptions: account lookup unavailable', 'guests: guest lookup unavailable']
      : [failed === 'account' ? 'subscriptions: account lookup unavailable' : 'guests: guest lookup unavailable'])
    expect(onNewAlert).toHaveBeenCalledTimes(failed === 'guest' ? 1 : 0)
    expect(onNewGuestAlert).toHaveBeenCalledTimes(failed === 'account' ? 1 : 0)
    if (failed === 'both') expect(mockFetchAlerts).not.toHaveBeenCalled()
  })

  it('processes many subscriptions without exceeding bounded concurrency', async () => {
    const subs = Array.from({ length: 12 }, (_, i) => ({
      ...denverSub,
      id: `sub-${i}`,
      saved_location_id: `loc-${i}`,
      latitude: 39.74 + i * 0.01,
    }))
    fetchEnabledSevereSubscriptions.mockResolvedValue(subs)
    mockFetchAlerts.mockResolvedValue([])

    let current = 0
    let max = 0
    const supabase = {
      from: (table: string) => {
        if (table === 'alert_monitor_state') {
          return {
            select: () => ({ in: async () => ({ data: [], error: null }) }),
            upsert: async () => {
              current += 1
              max = Math.max(max, current)
              await new Promise((resolve) => setTimeout(resolve, 20))
              current -= 1
              return { error: null }
            },
          }
        }
        if (table === 'bitwatch_deliveries') {
          return {
            insert: () => ({
              select: () => ({
                single: async () => ({ data: { id: 'outbox' }, error: null }),
              }),
            }),
            update: () => ({ eq: async () => ({ error: null }) }),
          }
        }
        throw new Error(`Unexpected table ${table}`)
      },
    }

    const result = await runSevereAlertMonitor(supabase as never)

    expect(result.subscriptionsChecked).toBe(12)
    expect(result.errors).toEqual([])
    expect(max).toBeGreaterThan(1)
    expect(max).toBeLessThanOrEqual(SEVERE_MONITOR_CONCURRENCY)
  })
})
