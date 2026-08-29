/**
 * 16-Bit Weather Platform - Hourly Forecast Layout
 *
 * Query-param route (lat/lon) — keep out of the index and do not emit
 * indexable JSON-LD or Open Graph as if this were a stable landing page.
 */

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '48-Hour Forecast | 16 Bit Weather',
  description:
    'Hour-by-hour weather forecast for the next 48 hours — temperature, precipitation chance, wind, and conditions.',
  robots: { index: false, follow: true },
}

export default function HourlyLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
