import { createHash, randomBytes } from 'crypto'

export function newGuestToken(): string {
  return randomBytes(32).toString('base64url')
}

export function hashGuestToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function guestVerifyExpiry(now = new Date()): string {
  return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString()
}
