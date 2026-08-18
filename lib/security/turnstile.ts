/**
 * Cloudflare Turnstile siteverify. Skips when TURNSTILE_SECRET_KEY is unset
 * so local/dev still works. Production guest subscribe should set the secret.
 */
export async function verifyTurnstileToken(
  token: string | undefined | null,
  remoteIp?: string | null,
): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret) return true
  if (!token || token.trim().length < 10) return false

  const body = new URLSearchParams({
    secret,
    response: token,
  })
  if (remoteIp) body.set('remoteip', remoteIp)

  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body,
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
