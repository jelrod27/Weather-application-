import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    // CSRF guard: this route is cookie-authenticated, so reject cross-site
    // POSTs (logout CSRF). Browsers send an Origin header on cross-origin
    // form/fetch POSTs; same-origin requests either match or omit it.
    const origin = request.headers.get('origin')
    if (origin) {
        try {
            if (new URL(origin).host !== new URL(request.url).host) {
                return NextResponse.json({ error: 'Invalid origin' }, { status: 403 })
            }
        } catch {
            return NextResponse.json({ error: 'Invalid origin' }, { status: 403 })
        }
    }

    const cookieStore = await cookies()

    const supabase = createServerClient(
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
                        // This can be ignored if you have middleware refreshing
                        // user sessions.
                    }
                },
            },
        }
    )

    // Sign out on the server side (clears cookies)
    await supabase.auth.signOut()

    // Redirect to home page
    return NextResponse.redirect(new URL('/', request.url), {
        status: 302,
    })
}
