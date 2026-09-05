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

function definedSecrets(values: Array<string | undefined>): string[] {
  return values.filter((value): value is string => typeof value === 'string' && value.length > 0)
}

/**
 * Secrets accepted when verifying a manage link: the current secret, the
 * previous one while a rotation is in flight, then the legacy fallbacks that
 * links were signed with before a dedicated secret existed.
 */
export function guestManageSecrets(): string[] {
  return definedSecrets([
    process.env.BITWATCH_MANAGE_SECRET,
    process.env.BITWATCH_MANAGE_SECRET_PREVIOUS,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    process.env.CRON_SECRET,
  ])
}

/**
 * Secret used to sign new links. BITWATCH_MANAGE_SECRET_PREVIOUS is
 * deliberately absent: a retired key must never sign fresh links, so a
 * misconfiguration that leaves only the previous secret set falls through to
 * the legacy fallbacks or to null (no link) rather than to the old key.
 */
export function guestManageSecret(): string | null {
  return (
    definedSecrets([
      process.env.BITWATCH_MANAGE_SECRET,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      process.env.CRON_SECRET,
    ])[0] ?? null
  )
}

export function signGuestManageToken(subscriberId: string, secret = guestManageSecret()): string | null {
  if (!secret || !subscriberId) return null
  const sig = createHmac('sha256', secret).update(subscriberId).digest('base64url')
  return `${MANAGE_PREFIX}${subscriberId}.${sig}`
}

function parseWithSecret(token: string, secret: string): string | null {
  if (!token.startsWith(MANAGE_PREFIX)) return null
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

export function parseSignedGuestManageToken(token: string, secret?: string): string | null {
  const secrets = secret ? [secret] : guestManageSecrets()
  for (const candidate of secrets) {
    const subscriberId = parseWithSecret(token, candidate)
    if (subscriberId) return subscriberId
  }
  return null
}

export function guestManagePath(subscriberId: string): string {
  const token = signGuestManageToken(subscriberId)
  if (!token) return '/alerts/manage'
  return `/alerts/manage?token=${encodeURIComponent(token)}`
}
