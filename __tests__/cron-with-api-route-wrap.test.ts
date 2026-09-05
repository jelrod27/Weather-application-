/**
 * Pins cron and webhook routes behind withApiRoute with rateLimit: false
 * so bearer/secret identity is not IP-quota gated. Session routes are
 * wrapped but still rate-limited.
 */

import { readFileSync } from 'fs'
import { join } from 'path'

const ROOT = join(__dirname, '..')

const SECRET_ROUTES = [
  'app/api/cron/aeroapi-usage/route.ts',
  'app/api/cron/bitwatch-ingest/route.ts',
  'app/api/cron/keep-alive/route.ts',
  'app/api/cron/severe-alerts/route.ts',
  'app/api/webhooks/new-user/route.ts',
] as const

describe('cron and webhook routes use withApiRoute', () => {
  it.each(SECRET_ROUTES)('%s is wrapped with rateLimit: false', (rel) => {
    const src = readFileSync(join(ROOT, rel), 'utf8')
    expect(src).toContain("from '@/lib/api/with-api-route'")
    expect(src).toMatch(/return withApiRoute\(\s*request\s*,/)
    expect(src).toContain('rateLimit: false')
  })

  it('welcome-email is wrapped on the account bucket', () => {
    const src = readFileSync(join(ROOT, 'app/api/auth/welcome-email/route.ts'), 'utf8')
    expect(src).toContain("from '@/lib/api/with-api-route'")
    expect(src).toContain("rateLimitBucket: 'account'")
    expect(src).not.toContain('rateLimit: false')
  })
})
