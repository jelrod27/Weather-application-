'use client'

import { Suspense, useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { capturePageView } from '@/lib/analytics/posthog'

function PostHogPageViewTracker() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (typeof window === 'undefined') return

    const query = searchParams.toString()
    const url = query ? `${pathname}?${query}` : pathname
    capturePageView(`${window.origin}${url}`)
  }, [pathname, searchParams])

  return null
}

export default function PostHogPageView() {
  return (
    <Suspense fallback={null}>
      <PostHogPageViewTracker />
    </Suspense>
  )
}
