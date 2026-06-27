'use client'

/**
 * PERFORMANCE: Lazy load analytics to reduce initial bundle size
 * Analytics are deferred until after the main content has loaded
 */

import dynamic from 'next/dynamic'

const Analytics = dynamic(
  () => import('@vercel/analytics/react').then(mod => mod.Analytics),
  { ssr: false }
)

const SpeedInsights = dynamic(
  () => import('@vercel/speed-insights/next').then(mod => mod.SpeedInsights),
  { ssr: false }
)

export default function AnalyticsWrapper() {
  return (
    <>
      <Analytics />
      <SpeedInsights />
    </>
  )
}
