/**
 * 16-Bit Weather Platform - Dashboard Layout
 * SEO metadata for user dashboard (noindex for user privacy)
 */

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Weather Dashboard',
  description: 'Your personalized weather dashboard with saved locations, preferences, and quick access to weather data. Retro terminal interface for weather enthusiasts.',
  robots: {
    index: false,
    follow: false,
  },
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
