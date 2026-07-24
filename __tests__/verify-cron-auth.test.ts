/**
 * Cron bearer auth — unit tests for verifyCronBearer.
 */

import { verifyCronBearer } from '@/lib/cron/verify-cron-auth'

function reqWithAuth(authorization?: string) {
  return {
    headers: {
      get(name: string): string | null {
        if (name.toLowerCase() !== 'authorization') return null
        return authorization ?? null
      },
    },
  }
}

describe('verifyCronBearer', () => {
  const original = process.env.CRON_SECRET

  afterEach(() => {
    if (original === undefined) {
      delete process.env.CRON_SECRET
    } else {
      process.env.CRON_SECRET = original
    }
  })

  it('returns 500 when CRON_SECRET is not configured', () => {
    delete process.env.CRON_SECRET
    const result = verifyCronBearer(reqWithAuth('Bearer anything'))
    expect(result).toEqual({
      ok: false,
      status: 500,
      message: 'CRON_SECRET not configured',
    })
  })

  it('returns 401 when Authorization header is missing', () => {
    process.env.CRON_SECRET = 'test-secret'
    const result = verifyCronBearer(reqWithAuth())
    expect(result).toEqual({
      ok: false,
      status: 401,
      message: 'Unauthorized',
    })
  })

  it('returns 401 when bearer token does not match', () => {
    process.env.CRON_SECRET = 'test-secret'
    const result = verifyCronBearer(reqWithAuth('Bearer wrong'))
    expect(result).toEqual({
      ok: false,
      status: 401,
      message: 'Unauthorized',
    })
  })

  it('returns 401 when token length differs (timing-safe path)', () => {
    process.env.CRON_SECRET = 'short'
    const result = verifyCronBearer(reqWithAuth('Bearer much-longer-token'))
    expect(result).toEqual({
      ok: false,
      status: 401,
      message: 'Unauthorized',
    })
  })

  it('returns ok when bearer matches CRON_SECRET', () => {
    process.env.CRON_SECRET = 'test-secret'
    const result = verifyCronBearer(reqWithAuth('Bearer test-secret'))
    expect(result).toEqual({ ok: true })
  })
})
