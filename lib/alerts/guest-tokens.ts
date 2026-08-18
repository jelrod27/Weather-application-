import { createHash, createHmac, randomBytes, timingSafeEqual } from 'crypto'

const MANAGE_PREFIX = 'g1.'

export function newGuestToken(): string {
  return randomBytes(32).toString('base64url')
}

export function hashGuestToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function guestVerifyExpiry(now = new Date()): string {
  return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString()
}

export function guestManageSecret(): string | null {
  return (
    process.env.BITWATCH_MANAGE_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.CRON_SECRET ||
    null
  )
}

export function signGuestManageToken(subscriberId: string, secret = guestManageSecret()): string | null {
  if (!secret || !subscriberId) return null
  const sig = createHmac('sha256', secret).update(subscriberId).digest('base64url')
  return `${MANAGE_PREFIX}${subscriberId}.${sig}`
}

export function parseSignedGuestManageToken(
  token: string,
  secret = guestManageSecret(),
): string | null {
  if (!secret || !token.startsWith(MANAGE_PREFIX)) return null
  const rest = token.slice(MANAGE_PREFIX.length)
  const dot = rest.lastIndexOf('.')
  if (dot <= 0) return null
  const subscriberId = rest.slice(0, dot)
  const given = rest.slice(dot + 1)
  if (!subscriberId || !given) return null
  const expected = createHmac('sha256', secret).update(subscriberId).digest('base64url')
  const givenBuf = Buffer.from(given)
  const expectedBuf = Buffer.from(expected)
  if (givenBuf.length !== expectedBuf.length) return null
  if (!timingSafeEqual(givenBuf, expectedBuf)) return null
  return subscriberId
}

export function guestManagePath(subscriberId: string): string {
  const token = signGuestManageToken(subscriberId)
  if (!token) return '/alerts/manage'
  return `/alerts/manage?token=${encodeURIComponent(token)}`
}
