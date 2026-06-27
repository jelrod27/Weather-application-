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
    type: 'website',
  },
};

export default function StargazerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
