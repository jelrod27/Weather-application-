import { readFileSync } from 'fs'
import { join } from 'path'
import {
  AUTH_SESSION_LOOKUP_TIMEOUT_MS,
} from '@/lib/auth/middleware-redirects'
import {
  SUPABASE_FETCH_TIMEOUT_MS,
  createSupabaseTimedFetch,
} from '@/lib/supabase/timed-fetch'

function hungFetch(_input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  return new Promise((_resolve, reject) => {
    const signal = init?.signal
    if (!signal) {
      return
    }
    if (signal.aborted) {
      reject(signal.reason)
      return
    }
    signal.addEventListener('abort', () => {
      reject(signal.reason)
    })
  })
}

describe('createSupabaseTimedFetch', () => {
  const originalFetch = globalThis.fetch

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('aborts a hung request instead of waiting forever', async () => {
    const fetchMock = jest.fn(hungFetch)
    globalThis.fetch = fetchMock as typeof fetch

    const timedFetch = createSupabaseTimedFetch(20)
    await expect(timedFetch('https://example.supabase.co/auth/v1/user')).rejects.toThrow()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('does not retry after a timeout', async () => {
    const fetchMock = jest.fn(hungFetch)
    globalThis.fetch = fetchMock as typeof fetch

    const timedFetch = createSupabaseTimedFetch(20)
    await timedFetch('https://example.supabase.co/rest/v1/profiles').catch(() => undefined)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('passes a successful response through', async () => {
    const ok = { status: 200, text: async () => 'ok' }
    globalThis.fetch = jest.fn(async () => ok) as unknown as typeof fetch

    const timedFetch = createSupabaseTimedFetch(50)
    const response = await timedFetch('https://example.supabase.co/auth/v1/user')
    expect(response.status).toBe(200)
    await expect(response.text()).resolves.toBe('ok')
  })
})

describe('supabase clients fail fast when the project is paused', () => {
  const read = (relativePath: string): string =>
    readFileSync(join(__dirname, '..', relativePath), 'utf8')

  it('caps auth lookup and supabase fetch at the same short timeout', () => {
    expect(AUTH_SESSION_LOOKUP_TIMEOUT_MS).toBe(SUPABASE_FETCH_TIMEOUT_MS)
    expect(SUPABASE_FETCH_TIMEOUT_MS).toBeLessThanOrEqual(3000)
  })

  it('does not import the retrying fetchWithTimeout helper', () => {
    expect(read('lib/supabase/timed-fetch.ts')).not.toMatch(
      /from ['"]@\/lib\/fetch-with-timeout['"]/,
    )
  })

  it.each([
    'lib/supabase/client.ts',
    'lib/supabase/server.ts',
    'lib/supabase/service-role-client.ts',
    'middleware.ts',
    'app/api/locations/route.ts',
    'app/auth/callback/route.ts',
    'app/auth/signout/route.ts',
    'app/api/auth/welcome-email/route.ts',
  ])('wires timed fetch into %s', (relativePath: string) => {
    expect(read(relativePath)).toContain('supabaseTimedFetch')
  })

  it('reuses the timed service-role factory for AeroAPI usage accounting', () => {
    expect(read('lib/services/aeroapi-usage.ts')).toContain('createServiceRoleSupabaseClient')
  })

  it('pings supabase daily so a free-tier pause is less likely', () => {
    const vercel = JSON.parse(read('vercel.json')) as {
      crons: Array<{ path: string; schedule: string }>
    }
    const keepAlive = vercel.crons.find((cron) => cron.path === '/api/cron/keep-alive')
    expect(keepAlive?.schedule).toBe('0 12 * * *')
  })
})
