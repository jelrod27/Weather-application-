import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { isPlaywrightTestModeRequest } from '@/lib/playwright-test-mode'
import {
  AUTH_SESSION_LOOKUP_TIMEOUT_MS,
  needsAuthSessionLookup,
  resolveAuthenticatedAuthRouteRedirect,
} from '@/lib/auth/middleware-redirects'
import type { User } from '@supabase/supabase-js'

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
    // Aviation LiveAircraftMap: Carto Voyager basemap tiles + OpenFreeMap glyphs.
    // Radar OpenLayers also uses basemaps.cartocdn.com (img-src already allows https:).
    "connect-src 'self' https://pollen.googleapis.com https://www.google.com https://*.supabase.co https://*.sentry.io https://vitals.vercel-insights.com https://mesonet.agron.iastate.edu https://tile.openstreetmap.org https://*.basemaps.cartocdn.com https://tiles.openfreemap.org https://vercel.live https://vercel.com https://ipapi.co https://ipinfo.io",
    "worker-src 'self' blob:",
    "frame-src 'self' https://vercel.live https://challenges.cloudflare.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
    ...(isProd ? ['upgrade-insecure-requests'] : []),
  ].join('; ')
}

async function getVerifiedUserOrNull(
  supabase: ReturnType<typeof createServerClient>,
): Promise<User | null> {
  try {
    const timedOut = new Promise<null>((resolve) => {
      setTimeout(() => resolve(null), AUTH_SESSION_LOOKUP_TIMEOUT_MS)
    })
    const lookup = supabase.auth.getUser().then(
      (result: { data: { user: User | null } }) => result.data.user,
      () => null,
    )
    return await Promise.race([lookup, timedOut])
  } catch (error) {
    console.error('[middleware] auth lookup failed', error)
    return null
  }
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
  // are never session-gated here. Skip the per-request `getUser()` round-trip.
  // Session cookie refresh still runs on /profile, /saved-locations, and /auth.
  if (request.nextUrl.pathname.startsWith('/api/')) {
    return response
  }

  // TEST MODE: Skip auth checks during E2E (same rules as API routes — see lib/playwright-test-mode.ts)

  if (isPlaywrightTestModeRequest(request)) {
    return response
  }

  // Public pages (home, radar, blog, …) only need CSP. A failing/retrying
  // supabase.auth.getUser() on every navigation 504'd production: Vercel
  // kills Edge middleware that does not respond within 25s.
  if (!needsAuthSessionLookup(request.nextUrl.pathname)) {
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

  const user = await getVerifiedUserOrNull(supabase)

  const isProtectedRoute =
    request.nextUrl.pathname.startsWith('/profile') ||
    request.nextUrl.pathname.startsWith('/saved-locations')

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
