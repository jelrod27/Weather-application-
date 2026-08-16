import { SUPABASE_FETCH_TIMEOUT_MS } from '@/lib/supabase/timed-fetch'
import { validateRedirectPath } from '@/lib/utils/redirect-validation'

const PROTECTED_ROUTE_PREFIXES = ['/profile', '/saved-locations'] as const
const AUTH_ROUTE_PREFIXES = ['/auth/login', '/auth/signup'] as const

/** Cap edge `getUser()` so a hung Supabase fetch cannot trip Vercel's 25s middleware gateway timeout. */
export const AUTH_SESSION_LOOKUP_TIMEOUT_MS = SUPABASE_FETCH_TIMEOUT_MS

/**
 * Homepage and other public routes do not need a verified session in middleware.
 * Calling `getUser()` on every navigation caused production 504s when the
 * Edge fetch to Supabase failed and retried until Vercel killed the function.
 */
export function needsAuthSessionLookup(pathname: string): boolean {
  if (pathname.startsWith('/api/')) {
    return false
  }

  if (PROTECTED_ROUTE_PREFIXES.some((route) => pathname.startsWith(route))) {
    return true
  }

  if (pathname === '/auth') {
    return true
  }

  return AUTH_ROUTE_PREFIXES.some((route) => pathname.startsWith(route))
}

/**
 * Where to send an authenticated user who hits /auth/login or /auth/signup.
 */
export function resolveAuthenticatedAuthRouteRedirect(nextParam: string | null): string {
  return validateRedirectPath(nextParam)
}
