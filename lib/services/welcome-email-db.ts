export interface WelcomeEmailProfile {
  username: string | null
  fullName: string | null
  welcomeEmailSentAt: string | null
}

function getAdminRestConfig(): { url: string; key: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '')
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return { url, key }
}

function adminHeaders(key: string): HeadersInit {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
  }
}

export async function fetchWelcomeEmailProfile(
  userId: string,
): Promise<WelcomeEmailProfile | null> {
  const config = getAdminRestConfig()
  if (!config) return null

  const params = new URLSearchParams({
    id: `eq.${userId}`,
    select: 'username,full_name,welcome_email_sent_at',
  })

  const response = await fetch(`${config.url}/rest/v1/profiles?${params.toString()}`, {
    headers: adminHeaders(config.key),
    cache: 'no-store',
  })

  if (!response.ok) {
    console.error('[welcome-email] Profile fetch failed:', response.status)
    return null
  }

  const rows = (await response.json()) as Array<{
    username: string | null
    full_name: string | null
    welcome_email_sent_at: string | null
  }>

  const row = rows[0]
  if (!row) return null

  return {
    username: row.username,
    fullName: row.full_name,
    welcomeEmailSentAt: row.welcome_email_sent_at,
  }
}

export async function markWelcomeEmailSentViaRest(userId: string): Promise<boolean> {
  const config = getAdminRestConfig()
  if (!config) {
    console.error('[welcome-email] SUPABASE_SERVICE_ROLE_KEY not configured; cannot mark sent')
    return false
  }

  const params = new URLSearchParams({
    id: `eq.${userId}`,
    welcome_email_sent_at: 'is.null',
  })

  const response = await fetch(`${config.url}/rest/v1/profiles?${params.toString()}`, {
    method: 'PATCH',
    headers: {
      ...adminHeaders(config.key),
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({ welcome_email_sent_at: new Date().toISOString() }),
  })

  if (!response.ok) {
    console.error('[welcome-email] Failed to mark welcome_email_sent_at:', response.status)
    return false
  }

  return true
}
