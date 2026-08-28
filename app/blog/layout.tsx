import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '16 Bit Weather Blog | Weekly Dispatches from 16bitbot',
  description:
    'Weekly dispatches from 16bitbot. Space weather, severe storms, weather phenomena, and climate records.',
}

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
