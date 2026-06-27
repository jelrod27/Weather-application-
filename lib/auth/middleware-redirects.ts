import { validateRedirectPath } from '@/lib/utils/redirect-validation'

/**
 * Where to send an authenticated user who hits /auth/login or /auth/signup.
 */
export function resolveAuthenticatedAuthRouteRedirect(nextParam: string | null): string {
  return validateRedirectPath(nextParam)
}
