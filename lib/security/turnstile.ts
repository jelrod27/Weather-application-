/**
 * Cloudflare Turnstile siteverify. When neither site key nor secret is set,
 * local/dev skips verification. If the public site key is set without a
 * secret, verification fails closed.
 */
import { fetchWithTimeout } from '@/lib/fetch-with-timeout'

const SITEVERIFY_TIMEOUT_MS = 4_000

export async function verifyTurnstileToken(
  token: string | undefined | null,
  remoteIp?: string | null,
): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
  if (!secret) return !siteKey
  if (!token || token.trim().length < 10) return false

  const body = new URLSearchParams({
    secret,
    response: token,
  })
  if (remoteIp) body.set('remoteip', remoteIp)

  try {
    const res = await fetchWithTimeout('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body,
      timeoutMs: SITEVERIFY_TIMEOUT_MS,
      maxRetries: 0,
    })
    if (!res.ok) return false
    const data = (await res.json()) as { success?: boolean }
    return data.success === true
  } catch (error) {
    console.error('[turnstile] siteverify failed', error)
    return false
  }
}

export function requestIp(request: { headers: Headers }): string | null {
  return (
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    null
  )
}
