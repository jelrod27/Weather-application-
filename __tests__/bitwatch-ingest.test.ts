/**
 * @jest-environment node
 */

import { runBitwatchIngest } from '@/lib/bitwatch/ingest'
import type { NWSAlertDetail } from '@/lib/services/nws-alerts-service'
import {
  fetchActiveAlertsDetail,
  fetchNwsAlertPages,
} from '@/lib/services/nws-alerts-service'

jest.mock('@/lib/services/nws-alerts-service', () => ({
  fetchNwsAlertPages: jest.fn(),
  fetchActiveAlertsDetail: jest.fn(),
  harmWarningCollectionUrl: jest.fn(() => 'https://api.weather.gov/alerts'),
}))

const NEW_TOR = '/O.NEW.KLWX.TO.W.0023.260418T2100Z-260418T2200Z/'

function alert(
  partial: Partial<NWSAlertDetail> & Pick<NWSAlertDetail, 'id' | 'event' | 'sent'>,
): NWSAlertDetail {
  return {
    headline: partial.headline ?? partial.event,
    severity: 'Severe',
    urgency: 'Immediate',
    expires: '2026-04-18T22:00:00Z',
    areaDesc: 'Fairfax',
    effective: partial.sent,
    ends: '2026-04-18T22:00:00Z',
    description: 'Tornado warning',
    instruction: 'Take shelter.',
    certainty: 'Observed',
    response: 'Shelter',
    sender: 'w-nws.webmaster@noaa.gov',
    geometry: null,
    hazard: { maxHail: null, maxWind: null, source: null, damageThreat: null },
    messageType: 'Alert',
    warningEventId: partial.id,
    vtecAction: 'NEW',
    vtecRaw: [NEW_TOR],
    ugc: [],
    affectedZones: [],
    motion: null,
    ...partial,
  }
}

type UpsertCall = { table: string; rows: unknown[] }

function createSupabase(
  state: {
    watermark_sent: string | null
    last_success_at: string | null
    lease_until: string | null
  } | null,
  options?: { failSourceMessages?: boolean },
) {
  const orFilters: string[] = []
  const upserts: UpsertCall[] = []

  const from = (table: string) => {
    let orFilter: string | undefined
    let selected: string | undefined
    const builder: Record<string, unknown> = {}
    const self = () => builder
    const leaseUpdateResult = () => {
      // PostgREST re-applies `.or()` to the RETURNING CTE. Selecting `id`
      // makes `lease_until` missing on that CTE — the production outage.
      if (selected) {
        return {
          data: null,
          error: { message: 'column bitwatch_ingest_state.lease_until does not exist' },
          count: null,
        }
      }
      // Quoted ISO timestamps split on `:` and never match.
      if (orFilter && (/lte\."/.test(orFilter) || /T\d{2}:\d{2}/.test(orFilter))) {
        return { data: null, error: null, count: 0 }
      }
      const held =
        Boolean(state?.lease_until) &&
        Date.parse(state!.lease_until!) > Date.parse('2026-08-23T22:00:00.000Z')
      return { data: null, error: null, count: held ? 0 : 1 }
    }
    Object.assign(builder, {
      select: (columns?: string) => {
        selected = columns ?? '*'
        return builder
      },
      eq: self,
      filter: self,
      or: (filter: string) => {
        orFilter = filter
        orFilters.push(filter)
        return builder
      },
      insert: () => Promise.resolve({ error: null }),
      update: self,
      upsert: (payload: unknown) => {
        const rows = Array.isArray(payload) ? payload : [payload]
        upserts.push({ table, rows })
        if (options?.failSourceMessages && table === 'bitwatch_source_messages') {
          return Promise.resolve({
            error: { message: 'payload too large', code: '57014' },
          })
        }
        return Promise.resolve({ error: null })
      },
      maybeSingle: () => {
        if (orFilter !== undefined) {
          return Promise.resolve(leaseUpdateResult())
        }
        return Promise.resolve({ data: state, error: null })
      },
      then: (
        resolve: (value: { data: null; error: { message: string } | null; count: number | null }) => unknown,
        reject: (reason: unknown) => unknown,
      ) => Promise.resolve(orFilter !== undefined ? leaseUpdateResult() : { data: null, error: null, count: null }).then(resolve, reject),
    })
    return builder
  }

  return { from, orFilters, upserts }
}

describe('runBitwatchIngest', () => {
  const tornado = alert({
    id: 'https://api.weather.gov/alerts/urn:oid:tornado-1',
    event: 'Tornado Warning',
    sent: '2026-04-18T21:00:00Z',
  })

  beforeEach(() => {
    jest.mocked(fetchNwsAlertPages).mockReset().mockResolvedValue([tornado])
    jest.mocked(fetchActiveAlertsDetail).mockReset().mockResolvedValue([tornado])
  })

  it('reclaims an expired lease and writes warning events', async () => {
    const supabase = createSupabase({
      watermark_sent: null,
      last_success_at: null,
      lease_until: '2026-08-18T20:07:56.414Z',
    })

    const result = await runBitwatchIngest(supabase as never, Date.parse('2026-08-23T22:00:00.000Z'))

    expect(result.skipped).toBe(false)
    expect(result.ok).toBe(true)
    expect(supabase.orFilters.some((filter) => filter.includes('lte.now'))).toBe(true)
    expect(
      supabase.upserts.some(
        (call) => call.table === 'bitwatch_warning_events' && call.rows.length >= 1,
      ),
    ).toBe(true)
  })

  it('persists source messages and warning events in one upsert each', async () => {
    const second = alert({
      id: 'https://api.weather.gov/alerts/urn:oid:tornado-2',
      event: 'Tornado Warning',
      sent: '2026-04-18T21:05:00Z',
      vtecRaw: ['/O.NEW.KLWX.TO.W.0024.260418T2105Z-260418T2200Z/'],
    })
    jest.mocked(fetchNwsAlertPages).mockResolvedValue([tornado, second])
    jest.mocked(fetchActiveAlertsDetail).mockResolvedValue([tornado, second])

    const supabase = createSupabase({
      watermark_sent: null,
      last_success_at: null,
      lease_until: null,
    })

    const result = await runBitwatchIngest(supabase as never, Date.parse('2026-08-23T22:00:00.000Z'))

    expect(result.ok).toBe(true)
    expect(result.messages).toBe(2)
    const messageCalls = supabase.upserts.filter((call) => call.table === 'bitwatch_source_messages')
    const eventCalls = supabase.upserts.filter((call) => call.table === 'bitwatch_warning_events')
    expect(messageCalls).toHaveLength(1)
    expect(messageCalls[0]?.rows).toHaveLength(2)
    expect(eventCalls).toHaveLength(1)
    expect(eventCalls[0]?.rows.length).toBeGreaterThanOrEqual(1)
  })

  it('skips when another worker still holds the lease', async () => {
    const supabase = createSupabase({
      watermark_sent: '2026-08-23T21:59:00.000Z',
      last_success_at: '2026-08-23T21:59:00.000Z',
      lease_until: '2026-08-23T22:00:50.000Z',
    })

    const result = await runBitwatchIngest(supabase as never, Date.parse('2026-08-23T22:00:00.000Z'))

    expect(result).toEqual({
      ok: true,
      skipped: true,
      messages: 0,
      activeEvents: 0,
      watermark: '2026-08-23T21:59:00.000Z',
    })
    expect(supabase.upserts).toHaveLength(0)
  })

  it('records last_success_at even when source-message upserts fail', async () => {
    const supabase = createSupabase(
      {
        watermark_sent: null,
        last_success_at: null,
        lease_until: null,
      },
      { failSourceMessages: true },
    )

    const result = await runBitwatchIngest(supabase as never, Date.parse('2026-08-23T22:00:00.000Z'))

    expect(result.ok).toBe(true)
    const stateWrites = supabase.upserts.filter((call) => call.table === 'bitwatch_ingest_state')
    expect(stateWrites.some((call) => (call.rows[0] as { last_success_at?: string }).last_success_at)).toBe(
      true,
    )
  })
})
