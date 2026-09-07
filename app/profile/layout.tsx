/**
 * 16-Bit Weather Platform - Profile Page Layout
 * SEO metadata for user profile (noindex for user privacy)
 */

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'My Profile',
  description: 'Manage your 16 Bit Weather profile, preferences, and saved locations.',
  robots: {
    index: false,
    follow: false,
  },
}

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
