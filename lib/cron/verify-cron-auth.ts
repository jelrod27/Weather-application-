import { timingSafeEqual } from 'node:crypto'

/** Minimal request shape — NextRequest or a test double. */
export type CronAuthRequest = {
  headers: { get(name: string): string | null }
}

export function verifyCronBearer(
  request: CronAuthRequest,
): { ok: true } | { ok: false; status: number; message: string } {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    return { ok: false, status: 500, message: 'CRON_SECRET not configured' }
  }

  const authHeader = request.headers.get('authorization') ?? ''
  const expected = `Bearer ${cronSecret}`
  const a = Buffer.from(authHeader)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, status: 401, message: 'Unauthorized' }
  }

  return { ok: true }
}
