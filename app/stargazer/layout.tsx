import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Stargazer - Astrophotography Forecast | 16-Bit Weather',
  description:
    "Get tonight's astrophotography conditions including seeing, transparency, moon phase, planet visibility, deep sky targets, ISS passes, and upcoming launches.",
  openGraph: {
    title: 'Stargazer - Astrophotography Forecast | 16-Bit Weather',
    description:
      "Get tonight's astrophotography conditions including seeing, transparency, moon phase, planet visibility, and deep sky targets.",
    url: 'https://www.16bitweather.co/stargazer',
    siteName: '16-Bit Weather',
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
    title: 'Stargazer - Astrophotography Forecast | 16-Bit Weather',
    description:
      "Tonight's seeing, transparency, moon phase, planets, and deep sky targets.",
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
