/**
 * After auth callback, send first-time users to dashboard onboarding when appropriate.
 */
export function resolvePostAuthRedirect(next: string): string {
  if (next === '/dashboard') {
    return '/dashboard?welcome=1'
  }
  return next
}
