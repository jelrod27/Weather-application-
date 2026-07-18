'use client'

interface RouteErrorFallbackProps {
  error: Error & { digest?: string }
  reset: () => void
  title?: string
}

export function RouteErrorFallback({
  error,
  reset,
  title = 'Something went wrong',
}: RouteErrorFallbackProps) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center px-4 py-16">
      <div className="max-w-md text-center">
        <h2 className="mb-2 text-2xl font-bold text-[var(--text)]">{title}</h2>
        <p className="mb-6 text-sm text-[var(--text-muted,var(--text))] opacity-80">
          {error.message || 'An unexpected error occurred on this page.'}
        </p>
        <button
          type="button"
          onClick={reset}
          className="rounded border border-[var(--border,currentColor)] px-4 py-2 text-[var(--primary,var(--text))] hover:underline"
        >
          Try again
        </button>
      </div>
    </div>
  )
}
