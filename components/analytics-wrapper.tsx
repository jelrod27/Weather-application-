'use client'

/**
 * PERFORMANCE: Lazy load analytics to reduce initial bundle size.
 * PostHog handles product analytics; Speed Insights stays for Web Vitals.
 */

import dynamic from 'next/dynamic'

const SpeedInsights = dynamic(
  () => import('@vercel/speed-insights/next').then((mod) => mod.SpeedInsights),
  { ssr: false },
)

const PostHogPageView = dynamic(
  () => import('@/components/posthog-pageview'),
  { ssr: false },
)

export default function AnalyticsWrapper() {
  return (
    <>
      <PostHogPageView />
      <SpeedInsights />
    </>
  )
}
