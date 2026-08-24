/**
 * @jest-environment node
 */

import {
  chunkIdsForPostgrestInFilter,
  listActiveWarningEventIds,
  POSTGREST_IN_FILTER_MAX_CHARS,
  runBitwatchIngest,
} from '@/lib/bitwatch/ingest'
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
type EventStatus = 'active' | 'ended'
type QueryResult = {
  data: unknown
  error: { message: string } | null
  count: number | null
}

function createSupabase(
  state: {
    watermark_sent: string | null
    last_success_at: string | null
    lease_until: string | null
  } | null,
  seedEvents: Array<{ id: string; status: EventStatus }> = [],
) {
  const orFilters: string[] = []
  const upserts: UpsertCall[] = []
  const inFilters: string[][] = []
  const notInFilters: string[] = []
  const ranges: Array<[number, number]> = []
  const events = new Map(seedEvents.map((row) => [row.id, row.status]))

  const from = (table: string) => {
    let orFilter: string | undefined
    let selected: string | undefined
    let op: 'select' | 'update' | null = null
    let notInValue: string | undefined
    let inValues: string[] | undefined
    let rangeFrom: number | undefined
    let rangeTo: number | undefined
    const builder: Record<string, unknown> = {}
    const self = () => builder
    const leaseUpdateResult = (): QueryResult => {
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
    const resolveQuery = (): QueryResult => {
      if (table === 'bitwatch_ingest_state' && op === 'update') {
        return leaseUpdateResult()
      }
      if (table === 'bitwatch_warning_events' && op === 'select') {
        let rows = [...events.entries()]
          .filter(([, status]) => status === 'active')
          .map(([id]) => ({ id }))
          .sort((a, b) => a.id.localeCompare(b.id))
        if (rangeFrom !== undefined && rangeTo !== undefined) {
          rows = rows.slice(rangeFrom, rangeTo + 1)
        }
        return {
          data: rows,
          error: null,
          count: null,
        }
      }
      if (table === 'bitwatch_warning_events' && op === 'update') {
        if (notInValue) {
          notInFilters.push(notInValue)
          if (notInValue.length > 8192) {
            return { data: null, error: { message: 'Bad Request' }, count: null }
          }
        }
        if (inValues) {
          inFilters.push(inValues)
          for (const id of inValues) {
            if (events.get(id) === 'active') events.set(id, 'ended')
          }
        }
        return { data: null, error: null, count: inValues?.length ?? 0 }
      }
      return { data: null, error: null, count: null }
    }
    Object.assign(builder, {
      select: (columns?: string) => {
        op = 'select'
        selected = columns ?? '*'
        return builder
      },
      eq: self,
      filter: (_column: string, operator: string, value: string) => {
        if (operator === 'not.in') notInValue = value
        return builder
      },
      in: (_column: string, values: string[]) => {
        inValues = values
        return builder
      },
      order: self,
      range: (from: number, to: number) => {
        rangeFrom = from
        rangeTo = to
        ranges.push([from, to])
        return builder
      },
      or: (filter: string) => {
        orFilter = filter
        orFilters.push(filter)
        return builder
      },
      insert: () => Promise.resolve({ error: null }),
      update: () => {
        op = 'update'
        selected = undefined
        return builder
      },
      upsert: (payload: unknown) => {
        const rows = Array.isArray(payload) ? payload : [payload]
        upserts.push({ table, rows })
        if (table === 'bitwatch_warning_events') {
          for (const row of rows as Array<{ id?: string; status?: EventStatus }>) {
            if (row.id && row.status) events.set(row.id, row.status)
          }
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
        resolve: (value: QueryResult) => unknown,
        reject: (reason: unknown) => unknown,
      ) => Promise.resolve(resolveQuery()).then(resolve, reject),
    })
    return builder
  }

  return { from, orFilters, upserts, inFilters, notInFilters, events, ranges }
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

  it('expires stale active events without a PostgREST not.in URL over 8 KiB', async () => {
    const live = Array.from({ length: 400 }, (_, i) => {
      const etn = String(i + 1).padStart(4, '0')
      return alert({
        id: `https://api.weather.gov/alerts/urn:oid:tornado-${etn}`,
        event: 'Tornado Warning',
        sent: '2026-04-18T21:00:00Z',
        vtecRaw: [`/O.NEW.KLWX.TO.W.${etn}.260418T2100Z-260418T2200Z/`],
      })
    })
    jest.mocked(fetchNwsAlertPages).mockResolvedValue(live)
    jest.mocked(fetchActiveAlertsDetail).mockResolvedValue(live)

    const staleId = 'KOLD.SV.W.9999.2026'
    const supabase = createSupabase(
      {
        watermark_sent: null,
        last_success_at: null,
        lease_until: null,
      },
      [{ id: staleId, status: 'active' }],
    )

    const result = await runBitwatchIngest(supabase as never, Date.parse('2026-08-23T22:00:00.000Z'))

    expect(result.ok).toBe(true)
    expect(result.error).toBeUndefined()
    expect(supabase.notInFilters).toEqual([])
    expect(supabase.inFilters.flat()).toContain(staleId)
    expect(supabase.events.get(staleId)).toBe('ended')
    expect(supabase.ranges[0]).toEqual([0, 999])
  })
})

describe('listActiveWarningEventIds', () => {
  it('pages past a PostgREST max-rows window so stale IDs are not dropped', async () => {
    const seed = Array.from({ length: 5 }, (_, i) => ({
      id: `KOLD.SV.W.${String(i + 1).padStart(4, '0')}.2026`,
      status: 'active' as const,
    }))
    const supabase = createSupabase(
      {
        watermark_sent: null,
        last_success_at: null,
        lease_until: null,
      },
      seed,
    )

    const ids = await listActiveWarningEventIds(supabase as never, 2)

    expect(ids).toEqual(seed.map((row) => row.id).sort())
    expect(supabase.ranges).toEqual([
      [0, 1],
      [2, 3],
      [4, 5],
    ])
  })
})

describe('chunkIdsForPostgrestInFilter', () => {
  it('keeps each encoded in() list under the PostgREST URL budget', () => {
    const ids = Array.from({ length: 400 }, (_, i) => `KLWX.TO.W.${String(i).padStart(4, '0')}.2026`)
    const chunks = chunkIdsForPostgrestInFilter(ids)
    expect(chunks.length).toBeGreaterThan(1)
    expect(chunks.flat()).toEqual(ids)
    for (const chunk of chunks) {
      const encoded = `(${chunk.map((id) => `"${id}"`).join(',')})`
      expect(encoded.length).toBeLessThanOrEqual(POSTGREST_IN_FILTER_MAX_CHARS)
    }
  })
})

