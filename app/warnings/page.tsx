import type { Metadata } from 'next'
import { Suspense } from 'react'
import PageWrapper from '@/components/page-wrapper'
import WarningsSeoContent from '@/components/warnings/warnings-seo-content'
import WarningsClient from './warnings-client'

const BASE_URL = 'https://www.16bitweather.co'
const OG_IMAGE = '/api/og?title=Warnings+Command+Center&subtitle=NWS+Alerts+%2B+SPC+Outlook'

export const metadata: Metadata = {
  title: 'Warnings Command Center — NWS Alerts, SPC Outlook, Storm Reports | 16 Bit Weather',
  description:
    'Live NOAA/NWS active warnings with full instructions, SPC Day 1 outlook context, alert polygons on a map, SPC storm reports, and moderated community observations.',
  openGraph: {
    title: 'Warnings Command Center | 16 Bit Weather',
    description:
      'Live NWS warnings, SPC outlook context, alert polygons, storm reports, and community observations.',
    url: `${BASE_URL}/warnings`,
    siteName: '16 Bit Weather',
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: 'Warnings Command Center - 16 Bit Weather',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Warnings Command Center | 16 Bit Weather',
    description:
      'Live NWS warnings, SPC outlook context, alert polygons, and storm reports.',
    images: [OG_IMAGE],
  },
  alternates: { canonical: `${BASE_URL}/warnings` },
}

export default function WarningsPage() {
  return (
    <PageWrapper>
      {/* Server-rendered page H1: WarningsClient reads search params, so it and
          its heading are excluded from the prerendered HTML. */}
      <div className="max-w-7xl mx-auto px-4 pt-8 text-center space-y-2">
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight font-mono uppercase">
          Warning center
        </h1>
        <p className="text-sm font-mono text-muted-foreground tracking-wider">
          // YOUR PIN FIRST · NATIONAL BROWSE · NWS POLYGONS //
        </p>
      </div>
      <Suspense
        fallback={
          /* The desk that replaces this is tens of thousands of pixels tall.
             With a one-line fallback the SEO copy below sat near the top of the
             prerendered page and was thrown off-screen on hydration — a single
             0.667 layout shift, most of this route's CLS. Holding a viewport
             here puts that copy below the fold at first paint, so its move
             happens where the user cannot see it and CLS does not count it. */
          <div className="max-w-7xl mx-auto min-h-screen px-4 py-8 text-center font-mono text-muted-foreground animate-pulse">
            Loading warnings…
          </div>
        }
      >
        <WarningsClient />
      </Suspense>
      <WarningsSeoContent />
    </PageWrapper>
  )
}
