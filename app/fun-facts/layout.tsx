/**
 * 16-Bit Weather Platform - Fun Facts Layout
 * SEO metadata for weather fun facts and phenomena
 */

import type { Metadata } from 'next'

export const metadata: Metadata = {
  // The root layout's title template appends the brand.
  title: 'Weather Fun Facts & Rare Phenomena',
  description: 'Amazing weather facts and rare phenomena: ball lightning, thundersnow, fire rainbows and other atmospheric events, explained in 16-bit style.',
  keywords: 'weather facts, weather trivia, ball lightning, thundersnow, fire rainbow, weather phenomena, strange weather, rare weather events, atmospheric phenomena, cool weather facts, weird weather',
  openGraph: {
    title: '16-Bit Takes - Weather Fun Facts',
    description: 'Discover amazing weather facts and rare atmospheric phenomena. Ball lightning, thundersnow, and more.',
    url: 'https://www.16bitweather.co/fun-facts',
    siteName: '16 Bit Weather',
    images: [
      {
        url: '/api/og?title=Weather+Fun+Facts&subtitle=Strange+Phenomena+Explained',
        width: 1200,
        height: 630,
        alt: 'Weather Fun Facts - 16 Bit Weather',
      },
    ],
    locale: 'en_US',
    type: 'article',
  },
  twitter: {
    card: 'summary_large_image',
    title: '16-Bit Takes - Weather Fun Facts',
    description: 'Amazing weather facts and rare atmospheric phenomena',
    images: ['/api/og?title=Weather+Fun+Facts&subtitle=Strange+Phenomena+Explained'],
  },
  alternates: {
    canonical: 'https://www.16bitweather.co/fun-facts',
  },
}

export default function FunFactsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
