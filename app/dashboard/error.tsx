'use client'

import { RouteErrorFallback } from '@/components/route-error-fallback'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return <RouteErrorFallback error={error} reset={reset} title="Dashboard failed to load" />
}
