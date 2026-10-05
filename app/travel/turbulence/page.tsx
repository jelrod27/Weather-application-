import type { Metadata } from 'next';
import PageWrapper from '@/components/page-wrapper';
import TurbulenceOutlook from '@/components/travel/turbulence/TurbulenceOutlook';

export const metadata: Metadata = {
  title: 'US Turbulence Advisory Map | 16 Bit Weather',
  description: 'Explore NOAA turbulence advisories for the contiguous United States by published time and altitude. General weather context, with clear source and coverage limits.',
};

export default function TurbulencePage(): React.JSX.Element {
  return <PageWrapper><TurbulenceOutlook /></PageWrapper>;
}
