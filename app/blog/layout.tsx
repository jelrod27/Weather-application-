import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '16 Bit Weather Blog | Weekly Dispatches from 16bitbot',
  description:
    'Weekly dispatches from 16bitbot. Space weather, severe storms, weather phenomena, and climate records.',
  keywords: 'weather blog, space weather, severe weather, weather education, climate records, 16-bit weather',
  openGraph: {
    title: '16 Bit Weather Blog | Weekly Dispatches from 16bitbot',
    description:
      'Weekly dispatches from 16bitbot. Space weather, severe storms, weather phenomena, and climate records.',
    url: 'https://www.16bitweather.co/blog',
    siteName: '16 Bit Weather',
    images: [
      {
        url: '/api/og/blog?title=Weather+Blog&subtitle=Weekly+Dispatches+from+16bitbot',
        width: 1200,
        height: 630,
        alt: '16 Bit Weather Blog',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '16 Bit Weather Blog | Weekly Dispatches from 16bitbot',
    description:
      'Weekly dispatches from 16bitbot. Space weather, severe storms, and climate records.',
    images: ['/api/og/blog?title=Weather+Blog&subtitle=Weekly+Dispatches+from+16bitbot'],
  },
  alternates: {
    canonical: 'https://www.16bitweather.co/blog',
  },
}

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
