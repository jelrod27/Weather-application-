'use client'

/**
 * PERFORMANCE: Lazy load analytics to reduce initial bundle size
 * Analytics are deferred until after the main content has loaded
 */

import { useEffect } from 'react'
import dynamic from 'next/dynamic'
import { getPostHogSettings } from '@/lib/posthog'

const Analytics = dynamic(
  () => import('@vercel/analytics/react').then(mod => mod.Analytics),
  { ssr: false }
)

const SpeedInsights = dynamic(
  () => import('@vercel/speed-insights/next').then(mod => mod.SpeedInsights),
  { ssr: false }
)

export default function AnalyticsWrapper() {
  useEffect(() => {
    const settings = getPostHogSettings()
    if (!settings) return

    let cancelled = false

    // Load after hydration, and isolate analytics failures from the weather UI.
    void import('posthog-js')
      .then(({ default: posthog }) => {
        if (!cancelled && !posthog.__loaded) {
          posthog.init(settings.token, settings.options)
        }
      })
      .catch(() => {
        // Analytics is optional, including when a browser blocks the SDK.
      })

    return () => { cancelled = true }
  }, [])

  return (
    <>
      <Analytics />
      <SpeedInsights />
    </>
  )
}
