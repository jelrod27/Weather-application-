import PageWrapper from '@/components/page-wrapper';
import TurbulenceOutlook from '@/components/travel/turbulence/TurbulenceOutlook';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'US Turbulence Advisory Map | 16 Bit Weather',
  description: 'Explore NOAA turbulence advisories for the contiguous United States by published time and altitude. General weather context, with clear source and coverage limits.',
  alternates: { canonical: 'https://www.16bitweather.co/travel/turbulence' },
  openGraph: {
    title: 'US Turbulence Advisory Map',
    description: 'Explore NOAA advisories by published time and altitude, with clear source and coverage limits.',
    url: 'https://www.16bitweather.co/travel/turbulence',
    siteName: '16 Bit Weather',
    type: 'website',
    images: [{ url: '/api/og?title=US+Turbulence+Advisory+Map&subtitle=NOAA+Advisories', width: 1200, height: 630, alt: 'US Turbulence Advisory Map' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'US Turbulence Advisory Map',
    description: 'Explore NOAA advisories by published time and altitude, with clear source and coverage limits.',
    images: ['/api/og?title=US+Turbulence+Advisory+Map&subtitle=NOAA+Advisories'],
  },
};

export default function TurbulencePage(): React.JSX.Element {
  return <PageWrapper><TurbulenceOutlook /></PageWrapper>;
}
