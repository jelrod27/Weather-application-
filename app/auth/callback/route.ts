import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import type { Database } from '@/lib/supabase/types'
import { validateRedirectPath } from '@/lib/utils/redirect-validation'
import { maybeSendWelcomeEmail } from '@/lib/services/welcome-email-service'
import { resolvePostAuthRedirect } from '@/lib/auth/post-auth-redirect'

export async function handleAuthCallbackWelcome(user: {
  id: string
  email?: string
  email_confirmed_at?: string | null
}): Promise<void> {
  if (!user.email) return

  await maybeSendWelcomeEmail({
    id: user.id,
    email: user.email,
    emailConfirmedAt: user.email_confirmed_at ?? null,
  })
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = validateRedirectPath(searchParams.get('next'))
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  if (error) {
    console.error('[Auth Callback] OAuth error:', error, errorDescription)
    return NextResponse.redirect(
      `${origin}/auth/login?error=${encodeURIComponent(errorDescription || error)}`,
    )
  }

  if (!code) {
    console.error('[Auth Callback] No code provided')
    return NextResponse.redirect(`${origin}/auth/login?error=no_code`)
  }

  const cookieStore = await cookies()

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
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
            // setAll from a Server Component — middleware refreshes sessions.
          }
        },
      },
    },
  )

  const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

  if (exchangeError) {
    console.error('[Auth Callback] Exchange error:', exchangeError.message)
    return NextResponse.redirect(
      `${origin}/auth/login?error=${encodeURIComponent(exchangeError.message)}`,
    )
  }

  const user = data.user
  if (user) {
    await handleAuthCallbackWelcome(user)
  }

  const destination = resolvePostAuthRedirect(next)
  return NextResponse.redirect(`${origin}${destination}`, { status: 303 })
}
