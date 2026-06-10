import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { Database } from '@/lib/supabase/types'
import { validateRedirectPath } from '@/lib/utils/redirect-validation'

export async function GET(request: NextRequest) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    const next = validateRedirectPath(searchParams.get('next'))
    const error = searchParams.get('error')
    const errorDescription = searchParams.get('error_description')

    // Handle OAuth provider errors
    if (error) {
        console.error('[Auth Callback] OAuth error:', error, errorDescription)
        return NextResponse.redirect(
            `${origin}/auth/login?error=${encodeURIComponent(errorDescription || error)}`
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
                            cookieStore.set(name, value, options)
                        )
                    } catch {
                        // The `setAll` method was called from a Server Component.
                        // This can be ignored if you have middleware refreshing sessions.
                    }
                },
            },
        }
    )

    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    if (exchangeError) {
        console.error('[Auth Callback] Exchange error:', exchangeError.message)
        return NextResponse.redirect(
            `${origin}/auth/login?error=${encodeURIComponent(exchangeError.message)}`
        )
    }

    // Successful authentication - redirect directly to the intended destination
    // This provides a seamless experience without showing intermediate pages
    return NextResponse.redirect(`${origin}${next}`, { status: 303 })
}
