import type { Metadata } from 'next';

export const metadata: Metadata = {
  // The root layout's title template appends the brand.
  title: 'Stargazer: Tonight’s Sky and Beginner Guide',
  description:
    "Plan a beginner stargazing hour with local weather, realistic targets, direction diagrams and observing guides. Explore detailed photography conditions too.",
  openGraph: {
    title: 'Stargazer - Tonight’s Sky and Beginner Guide',
    description:
      "Choose an observing hour, find Moon and planet targets, and learn where to look with local weather and sky guides.",
    url: 'https://www.16bitweather.co/stargazer',
    siteName: '16 Bit Weather',
    images: [
      {
        url: '/api/og?title=Stargazer&subtitle=Tonight%27s+Sky+Forecast',
        width: 1200,
        height: 630,
        alt: 'Stargazer Command Center - 16 Bit Weather',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Stargazer - Tonight’s Sky and Beginner Guide',
    description:
      "Local observing hours, beginner targets and direction guides, with detailed photography conditions.",
    images: ['/api/og?title=Stargazer&subtitle=Tonight%27s+Sky+Forecast'],
  },
  alternates: {
    canonical: 'https://www.16bitweather.co/stargazer',
  },
};

export default function StargazerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
