/**
 * Pins cron, webhook, welcome-email, and test-sentry routes behind withApiRoute
 * with rateLimit: false so bearer/secret identity is not IP-quota gated.
 */

import { readFileSync } from 'fs'
import { join } from 'path'

const ROOT = join(__dirname, '..')

const WRAPPED = [
  'app/api/cron/aeroapi-usage/route.ts',
  'app/api/cron/bitwatch-ingest/route.ts',
  'app/api/cron/keep-alive/route.ts',
  'app/api/cron/severe-alerts/route.ts',
  'app/api/webhooks/new-user/route.ts',
  'app/api/auth/welcome-email/route.ts',
  'app/api/test-sentry-error/route.ts',
] as const

describe('cron and secret routes use withApiRoute', () => {
  it.each(WRAPPED)('%s is wrapped with rateLimit: false', (rel) => {
    const src = readFileSync(join(ROOT, rel), 'utf8')
    expect(src).toContain("from '@/lib/api/with-api-route'")
    expect(src).toMatch(/return withApiRoute\(\s*request\s*,/)
    expect(src).toContain('rateLimit: false')
  })
})
