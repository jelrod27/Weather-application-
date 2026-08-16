import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { Database } from '@/lib/supabase/types'
import { maybeSendWelcomeEmail } from '@/lib/services/welcome-email-service'
import { supabaseTimedFetch } from '@/lib/supabase/timed-fetch'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST() {
  const cookieStore = await cookies()

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { fetch: supabaseTimedFetch },
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // Ignored when called from a Server Component context.
          }
        },
      },
    },
  )

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await maybeSendWelcomeEmail({
    id: user.id,
    email: user.email,
    emailConfirmedAt: user.email_confirmed_at ?? null,
  })

  return NextResponse.json({
    ok: true,
    sent: result.sent,
    skipped: result.skipped,
    reason: result.reason,
  })
}
