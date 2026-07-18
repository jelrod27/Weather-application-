'use client'

import { RouteErrorFallback } from '@/components/route-error-fallback'

export default function SpaceWeatherError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return <RouteErrorFallback error={error} reset={reset} title="Space weather failed to load" />
}
