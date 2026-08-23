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

function createSupabase(state: {
  watermark_sent: string | null
  last_success_at: string | null
  lease_until: string | null
} | null) {
  const orFilters: string[] = []
  const upserts: UpsertCall[] = []

  const from = (table: string) => {
    let orFilter: string | undefined
    const builder: Record<string, unknown> = {}
    const self = () => builder
    Object.assign(builder, {
      select: self,
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
        return Promise.resolve({ error: null })
      },
      maybeSingle: () => {
        if (orFilter !== undefined) {
          // PostgREST `.or()` treats `:` inside a quoted ISO timestamp as a
          // value separator, so the reclaim predicate never matches.
          if (/lte\."/.test(orFilter) || /T\d{2}:\d{2}/.test(orFilter)) {
            return Promise.resolve({ data: null, error: null })
          }
          return Promise.resolve({ data: { id: 'nws-alerts' }, error: null })
        }
        return Promise.resolve({ data: state, error: null })
      },
      then: (resolve: (value: { error: null }) => unknown, reject: (reason: unknown) => unknown) =>
        Promise.resolve({ error: null }).then(resolve, reject),
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
})
