/**
 * Dependency-free AbortError check, safe to import from client code.
 * `lib/error-utils` re-exports it for server callers; client hooks import it
 * from here so they do not pull `@sentry/nextjs` into the browser bundle.
 */
export function isAbortError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    (error as { name?: unknown }).name === 'AbortError'
  )
}
