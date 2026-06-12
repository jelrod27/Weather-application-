/**
 * Unit tests for getProfile / updateProfile in lib/supabase/database.ts.
 *
 * Pins the error-classification and fallback branching added in the Phase 4
 * cleanup:
 *   - getProfile: missing-column error triggers a reduced-column fallback that
 *     fills in default values; any other error returns null without a second
 *     query.
 *   - updateProfile: missing-column error triggers a same-query retry (the
 *     "fallback" uses identical safeUpdates + selectColumns — see plan 008).
 *     Non-column errors (RLS, constraint) return null immediately.
 */

jest.mock('@/lib/supabase/client', () => ({ supabase: { from: jest.fn() } }))
jest.mock('@/lib/error-utils', () => ({ captureDbError: jest.fn() }))

import { getProfile, updateProfile } from '@/lib/supabase/database'
import { supabase } from '@/lib/supabase/client'
import { captureDbError } from '@/lib/error-utils'

type SingleResult = { data: unknown; error: { message: string } | null }

/** lastChain is populated each time queueResults is called, giving tests
 *  access to mock.calls on the chain built for the last from() invocation. */
let lastChain: Record<string, jest.Mock> = {}

/**
 * Queue per-call results for the .single() terminus of either query shape:
 *   select().eq().single()  or  update().select().eq().single()
 *
 * Each call to supabase.from() builds a fresh chainable object whose
 * .single() resolves the next queued result, in order.
 */
const queueResults = (...results: SingleResult[]) => {
  let call = 0
  ;(supabase.from as jest.Mock).mockImplementation(() => {
    const chain: Record<string, jest.Mock> = {}
    for (const m of ['select', 'eq', 'update']) {
      chain[m] = jest.fn(() => chain)
    }
    chain.single = jest.fn(() =>
      Promise.resolve(results[Math.min(call++, results.length - 1)])
    )
    lastChain = chain
    return chain
  })
}

const NULL_UUID = '00000000-0000-0000-0000-000000000000'

const row = {
  id: 'user-1',
  username: 'ada',
  full_name: 'Ada L',
  email: 'a@b.c',
  default_location: null,
  avatar_url: null,
  preferred_units: 'imperial' as const,
  timezone: 'UTC',
  created_at: 't',
  updated_at: 't',
}

beforeEach(() => jest.clearAllMocks())

// ---------------------------------------------------------------------------
// getProfile
// ---------------------------------------------------------------------------

describe('getProfile', () => {
  it('returns null for NULL_UUID without calling the DB', async () => {
    const result = await getProfile(NULL_UUID)
    expect(result).toBeNull()
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('returns null for empty userId without calling the DB', async () => {
    const result = await getProfile('')
    expect(result).toBeNull()
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('returns the row on success', async () => {
    queueResults({ data: row, error: null })
    const result = await getProfile('user-1')
    expect(result).toEqual(row)
    expect(supabase.from).toHaveBeenCalledTimes(1)
  })

  it('falls back to essential columns when a column is missing, filling defaults', async () => {
    queueResults(
      { data: null, error: { message: 'column profiles.timezone does not exist' } },
      { data: { id: 'user-1', username: 'ada', created_at: 't', updated_at: 't' }, error: null }
    )

    const result = await getProfile('user-1')

    expect(result).not.toBeNull()
    expect(result?.username).toBe('ada')
    expect(result?.preferred_units).toBe('imperial')
    expect(result?.email).toBeNull()
    expect(result?.full_name).toBeNull()
    // Two queries: first attempt + fallback
    expect(supabase.from).toHaveBeenCalledTimes(2)
  })

  it('returns null for a non-column error without retrying', async () => {
    queueResults({ data: null, error: { message: 'JWT expired' } })

    const result = await getProfile('user-1')

    expect(result).toBeNull()
    expect(supabase.from).toHaveBeenCalledTimes(1)
    expect(captureDbError).toHaveBeenCalledWith(
      'getProfile',
      expect.objectContaining({ message: 'JWT expired' }),
      expect.anything()
    )
  })

  it('returns null when the fallback query also fails', async () => {
    queueResults(
      { data: null, error: { message: 'column profiles.avatar_url does not exist' } },
      { data: null, error: { message: 'permission denied' } }
    )

    const result = await getProfile('user-1')

    expect(result).toBeNull()
    expect(captureDbError).toHaveBeenCalledWith(
      'getProfile.fallback',
      expect.objectContaining({ message: 'permission denied' }),
      expect.anything()
    )
  })
})

// ---------------------------------------------------------------------------
// updateProfile
// ---------------------------------------------------------------------------

describe('updateProfile', () => {
  it('returns a mock profile for NULL_UUID without calling the DB', async () => {
    const result = await updateProfile(NULL_UUID, { username: 'zoe' })

    expect(result).not.toBeNull()
    expect(result?.username).toBe('zoe')
    expect(result?.preferred_units).toBe('imperial')
    expect(result?.timezone).toBe('UTC')
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('returns the row on success and strips non-allowlisted fields from the update', async () => {
    queueResults({ data: row, error: null })

    // Pass email as a non-allowlisted field — cast through never so TypeScript
    // doesn't reject the call, but the runtime allowlist should strip it.
    const result = await updateProfile('user-1', {
      username: 'ada',
      ...(({ email: 'evil@x' } as never) as object),
    } as Parameters<typeof updateProfile>[1])

    expect(result).toEqual(row)
    // email must NOT appear in the update payload sent to Supabase
    const updateArg = lastChain.update.mock.calls[0]?.[0] as Record<string, unknown>
    expect(updateArg).not.toHaveProperty('email')
    expect(updateArg).toHaveProperty('username', 'ada')
  })

  it(
    'retries identically when a column-missing error occurs and succeeds on retry',
    async () => {
      // Pins that the "fallback" is a same-query retry — see plan 008.
      queueResults(
        { data: null, error: { message: 'column profiles.timezone does not exist' } },
        { data: row, error: null }
      )

      const result = await updateProfile('user-1', { username: 'ada' })

      expect(result).toEqual(row)
      // Two DB round-trips: first attempt + same-query retry
      expect(supabase.from).toHaveBeenCalledTimes(2)
      expect(captureDbError).toHaveBeenCalledWith(
        'updateProfile',
        expect.objectContaining({ message: 'column profiles.timezone does not exist' }),
        expect.anything()
      )
    }
  )

  it('returns null for an RLS-style error without retrying', async () => {
    queueResults({
      data: null,
      error: { message: 'new row violates row-level security policy' },
    })

    const result = await updateProfile('user-1', { username: 'ada' })

    expect(result).toBeNull()
    expect(supabase.from).toHaveBeenCalledTimes(1)
  })

  it('returns null when the fallback update also fails', async () => {
    queueResults(
      { data: null, error: { message: 'column profiles.avatar_url does not exist' } },
      { data: null, error: { message: 'another error' } }
    )

    const result = await updateProfile('user-1', { username: 'ada' })

    expect(result).toBeNull()
    expect(captureDbError).toHaveBeenCalledWith(
      'updateProfile.fallback',
      expect.objectContaining({ message: 'another error' }),
      expect.anything()
    )
  })

  it('returns null and calls captureDbError when success path returns no data', async () => {
    queueResults({ data: null, error: null })

    const result = await updateProfile('user-1', { username: 'ada' })

    expect(result).toBeNull()
    expect(captureDbError).toHaveBeenCalledWith(
      'updateProfile',
      expect.objectContaining({ message: 'No data returned' }),
      expect.anything()
    )
  })
})
