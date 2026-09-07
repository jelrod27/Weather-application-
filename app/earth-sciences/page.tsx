/**
 * 16-Bit Weather Platform - Earth Sciences Page
 *
 * Public surface for USGS seismic data. The USGS earthquake service was
 * already wired into the AI chat tool layer; this page exposes the same
 * data to users who don't open the chat. Server component wraps a client
 * leaf that handles filter tabs, sorting, and fetch orchestration.
 */
import type { Metadata } from 'next';
import PageWrapper from '@/components/page-wrapper';
import { ShareButtons } from '@/components/share-buttons';
import EarthSciencesSeoContent from '@/components/earth-sciences/earth-sciences-seo-content';
import EarthSciencesClient from './earth-sciences-client';

const BASE_URL = 'https://www.16bitweather.co';

export function generateMetadata(): Metadata {
  return {
    title: 'Earth Sciences — Live Global Earthquakes & Seismic Activity | 16 Bit Weather',
    description:
      'Real-time global earthquake monitoring powered by USGS. Filter by magnitude (M2.5+, M4.5+, M6+), sort by time or magnitude, and inspect depth, epicenter, and timing for every recent quake in a retro terminal UI.',
    alternates: { canonical: `${BASE_URL}/earth-sciences` },
    openGraph: {
      title: 'Earth Sciences — Live Global Earthquakes | 16 Bit Weather',
      description:
        'Live USGS earthquake feed with magnitude filters and sortable columns.',
      url: `${BASE_URL}/earth-sciences`,
      siteName: '16 Bit Weather',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Earth Sciences — Live Global Earthquakes',
      description:
        'Live USGS earthquake feed with magnitude filters and sortable columns.',
    },
  };
}

export default function EarthSciencesPage() {
  return (
    <PageWrapper>
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight font-mono uppercase">
            Earth Sciences
          </h1>
          <p className="text-sm font-mono text-muted-foreground tracking-wider">
            // USGS SEISMIC FEED // GLOBAL EARTHQUAKE MONITOR
          </p>
          <ShareButtons
            config={{
              title: 'Earth Sciences — Live Earthquakes',
              text: 'Live global earthquake activity via USGS at 16bitweather.co',
              url: `${BASE_URL}/earth-sciences`,
            }}
            className="mt-3 justify-center"
          />
        </div>

        <EarthSciencesClient />
      </div>

      {/* Evergreen crawlable copy — the quake table above is fetched client-side */}
      <EarthSciencesSeoContent />
    </PageWrapper>
  );
}
