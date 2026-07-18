import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { isPlaywrightTestModeRequest } from '@/lib/playwright-test-mode'
import { resolveAuthenticatedAuthRouteRedirect } from '@/lib/auth/middleware-redirects'

/**
 * Build a Content-Security-Policy for this request.
 *
 * `'unsafe-inline'` is required in `script-src` because most pages are
 * statically rendered (SSG) for SEO/perf — Next.js can't inject per-request
 * nonces into pre-baked HTML, so a nonce-only policy blocks every inline
 * hydration script and the app never boots. Non-prod additionally allows
 * `'unsafe-eval'` for dev tooling.
 */
function buildCspHeader(isProd: boolean): string {
  const scriptSrc = isProd
    ? `script-src 'self' 'unsafe-inline' https://vercel.live https://vercel.com https://va.vercel-scripts.com https://challenges.cloudflare.com`
    : `script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live https://vercel.com https://va.vercel-scripts.com https://challenges.cloudflare.com`

  return [
    "default-src 'self'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: https: blob:",
    // IP-based geolocation fallback (lib/location-service.ts) calls these
    // directly from the client when the user blocks or denies navigator
    // geolocation. Without the allowlist the weather widget's loading
    // skeleton never resolves.
    // tiles.openfreemap.org: MapLibre style JSON, vector tiles, glyphs, sprites
    // for the /aviation live sky map (components/aviation/LiveAircraftMap.tsx).
    "connect-src 'self' https://pollen.googleapis.com https://www.google.com https://*.supabase.co https://*.sentry.io https://vitals.vercel-insights.com https://mesonet.agron.iastate.edu https://tile.openstreetmap.org https://tiles.openfreemap.org https://vercel.live https://vercel.com https://ipapi.co https://ipinfo.io https://api.ipgeolocation.io",
    "worker-src 'self' blob:",
    "frame-src 'self' https://vercel.live https://challenges.cloudflare.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
    ...(isProd ? ['upgrade-insecure-requests'] : []),
  ].join('; ')
}

export async function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers)

  const isProd = process.env.NODE_ENV === 'production'
  const csp = buildCspHeader(isProd)

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
  response.headers.set('Content-Security-Policy', csp)

  // Legacy URL — redirect before Playwright test-mode bypass so E2E and prod behave the same
  if (request.nextUrl.pathname.startsWith('/settings')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // API routes authenticate themselves (cookie session or Bearer token) and
  // are never in `protectedRoutes`/`authRoutes` below. Skip the per-request
  // `getUser()` network round-trip for them — it added latency to every
  // public API call and logged AuthSessionMissingError noise for anonymous
  // traffic. Session cookie refresh for browser clients still happens on
  // page navigations, which always pass through the block below.
  if (request.nextUrl.pathname.startsWith('/api/')) {
    return response
  }

  // TEST MODE: Skip auth checks during E2E (same rules as API routes — see lib/playwright-test-mode.ts)

  if (isPlaywrightTestModeRequest(request)) {
    return response
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
            const existingCookies = requestHeaders.get('cookie')
            const newCookieValue = `${name}=${value}`
            requestHeaders.set(
              'cookie',
              existingCookies ? `${existingCookies}; ${newCookieValue}` : newCookieValue
            )
          })
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()


  // /dashboard is intentionally NOT protected: anonymous visitors get a
  // preview state with a sign-in CTA (app/dashboard/page.tsx) instead of a
  // redirect. Authenticated-only data stays safe behind RLS + API auth.
  const protectedRoutes = ['/profile', '/saved-locations']
  const isProtectedRoute = protectedRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  )

  if (isProtectedRoute && !user) {
    const redirectUrl = new URL('/auth', request.url)
    redirectUrl.searchParams.set('next', request.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // Exact match for the unified /auth page; prefix match for the legacy
  // login/signup aliases. Deliberately NOT a bare startsWith('/auth') —
  // that would swallow /auth/callback, /auth/signout, /auth/reset-password,
  // and /auth/update-password.
  const authRoutes = ['/auth/login', '/auth/signup']
  const isAuthRoute =
    request.nextUrl.pathname === '/auth' ||
    authRoutes.some((route) => request.nextUrl.pathname.startsWith(route))

  // Auth-route redirect is UX (skip login when already signed in), not an
  // authorization gate. Destination is allowlisted via validateRedirectPath.
  // codeql[js/user-controlled-bypass]: pathname selects auth UX routes only; redirect target is allowlisted
  if (isAuthRoute && user) {
    const next = resolveAuthenticatedAuthRouteRedirect(request.nextUrl.searchParams.get('next'))
    return NextResponse.redirect(new URL(next, request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
