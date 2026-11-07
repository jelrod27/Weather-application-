/** @jest-environment node */
import { upsertGuestSubscriber, verifyGuestSubscriber } from '@/lib/services/guest-alert-subscribers'
import { hashGuestToken } from '@/lib/alerts/guest-tokens'

type Row = Record<string, unknown>

// Stateful PostgREST double: predicates are evaluated at execution, not lookup.
function database() {
  const state = {
    row: {
      id: 'guest-1', email: 'owner@example.invalid', latitude: 40, longitude: -100,
      location_label: 'Pin A', enabled: true, verified_at: null,
      manage_token_hash: 'manage-A', verify_token_hash: hashGuestToken('token-A'),
      verify_token_expires_at: '2030-01-02T00:00:00.000Z',
    } as Row,
    pause: null as null | { reached: () => void; wait: Promise<void> },
  }
  function from() {
    const predicates: ((row: Row) => boolean)[] = []
    let payload: Row | null = null
    const query = {
      select: () => query,
      update: (value: Row) => { payload = value; return query },
      eq: (key: string, value: unknown) => { predicates.push(row => row[key] === value); return query },
      is: (key: string, value: unknown) => { predicates.push(row => row[key] === value); return query },
      gt: (key: string, value: string) => { predicates.push(row => typeof row[key] === 'string' && row[key] > value); return query },
      maybeSingle: () => execute(),
      then: (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) => execute().then(resolve, reject),
    }
    async function execute() {
      const matches = predicates.every(predicate => predicate(state.row))
      if (payload) {
        if (matches) state.row = { ...state.row, ...payload }
        return { data: matches ? { ...state.row } : null, error: null }
      }
      const snapshot = matches ? { ...state.row } : null
      const pause = state.pause
      state.pause = null
      if (pause) { pause.reached(); await pause.wait }
      return { data: snapshot, error: null }
    }
    return query
  }
  function pauseRead() {
    let reached!: () => void
    let resume!: () => void
    const paused = new Promise<void>(resolve => { reached = resolve })
    const wait = new Promise<void>(resolve => { resume = resolve })
    state.pause = { reached, wait }
    return { paused, resume }
  }
  return { state, pauseRead, client: { from } as never }
}

const pinB = { email: 'owner@example.invalid', latitude: 45, longitude: -90, locationLabel: 'Pin B', notifyTornado: false }

describe('guest verification row ownership under concurrency', () => {
  beforeEach(() => { jest.useFakeTimers(); jest.setSystemTime(new Date('2030-01-01T00:00:00Z')) })
  afterEach(() => jest.useRealTimers())

  it('does not verify a replacement pin using the previous token', async () => {
    const db = database()
    const pause = db.pauseRead()
    const verification = verifyGuestSubscriber(db.client, 'token-A')
    await pause.paused
    const replacement = await upsertGuestSubscriber(db.client, pinB)
    pause.resume()
    expect(await verification).toBeNull()
    expect(db.state.row.location_label).toBe('Pin B')
    expect(db.state.row.verified_at).toBeNull()
    expect(db.state.row.verify_token_hash).toBe(hashGuestToken(replacement.verifyToken!))
  })

  it('does not let a stale pending resend overwrite a verified pin', async () => {
    const db = database()
    const pause = db.pauseRead()
    const resend = upsertGuestSubscriber(db.client, pinB)
    // Attach a handler before resuming to avoid an unhandled rejection.
    const outcome = resend.then(() => 'updated', () => 'conflict')
    await pause.paused
    expect(await verifyGuestSubscriber(db.client, 'token-A')).not.toBeNull()
    pause.resume()
    expect(await outcome).toBe('conflict')
    expect(db.state.row.location_label).toBe('Pin A')
    expect(db.state.row.verified_at).not.toBeNull()
  })

  it('does not let an older resend replace a newer pending version', async () => {
    const db = database()
    const pause = db.pauseRead()
    const first = upsertGuestSubscriber(db.client, { ...pinB, locationLabel: 'older' })
    const outcome = first.then(() => 'updated', () => 'conflict')
    await pause.paused
    await upsertGuestSubscriber(db.client, pinB)
    pause.resume()
    expect(await outcome).toBe('conflict')
    expect(db.state.row.location_label).toBe('Pin B')
  })

  it.each([null, undefined, 'not-a-date', '2029-12-31T00:00:00Z', '2030-01-01T00:00:00Z'])('rejects invalid or expired expiry %s', async expiry => {
    const db = database()
    db.state.row.verify_token_expires_at = expiry
    expect(await verifyGuestSubscriber(db.client, 'token-A')).toBeNull()
    expect(db.state.row.verified_at).toBeNull()
  })

  it('rejects a token that expires between lookup and update', async () => {
    const db = database()
    const pause = db.pauseRead()
    const pending = verifyGuestSubscriber(db.client, 'token-A')
    await pause.paused
    jest.setSystemTime(new Date('2030-01-03T00:00:00Z'))
    pause.resume()
    expect(await pending).toBeNull()
  })

  it('returns the committed row once and rejects replay or a wrong token', async () => {
    const db = database()
    expect(await verifyGuestSubscriber(db.client, 'wrong')).toBeNull()
    const result = await verifyGuestSubscriber(db.client, 'token-A')
    expect(result).toMatchObject({ id: 'guest-1', locationLabel: 'Pin A', verifiedAt: '2030-01-01T00:00:00.000Z' })
    expect(db.state.row.verify_token_hash).toBeNull()
    expect(await verifyGuestSubscriber(db.client, 'token-A')).toBeNull()
  })
})
