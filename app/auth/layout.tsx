import type { Metadata } from 'next'

/** Auth routes should not appear in search results. */
export const metadata: Metadata = {
  robots: { index: false, follow: true },
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
