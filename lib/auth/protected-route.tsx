'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from './auth-context'

interface ProtectedRouteProps {
  children: React.ReactNode
  redirectTo?: string
}

export function ProtectedRoute({ children, redirectTo = '/auth/login' }: ProtectedRouteProps) {
  // Hooks must be called unconditionally at the top
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  // The previous Playwright test-mode bypass that rendered children
  // unconditionally lived here. Removed in Phase 4 cleanup (Phase 1 M2):
  // it relied on a NEXT_PUBLIC_ env var that gets inlined into client
  // bundles, so a misconfigured prod build would expose every protected
  // page to anonymous visitors. E2E auth is now handled via real test-user
  // sessions seeded by Playwright fixtures, not a render-layer bypass.
  useEffect(() => {
    if (!loading && !user) {
      // Preserve the attempted path so auth returns the user here afterwards
      // (mirrors the ?next= behavior of the middleware redirect).
      const target =
        pathname && pathname !== '/'
          ? `${redirectTo}?next=${encodeURIComponent(pathname)}`
          : redirectTo
      router.push(target)
    }
  }, [user, loading, router, redirectTo, pathname])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return <>{children}</>
}