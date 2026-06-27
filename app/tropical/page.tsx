/**
 * 16-Bit Weather Platform - Tropical Tracker Page
 *
 * NHC tropical outlooks, satellite imagery, and hurricane season info.
 * Pure server component — all data is static image references to NHC.
 */
import React from 'react';
import PageWrapper from '@/components/page-wrapper';
import { ExternalLink } from 'lucide-react';
import { ShareButtons } from '@/components/share-buttons';

const NHC_BASE = 'https://www.nhc.noaa.gov';

const graphics = [
  {
    title: '2-DAY TROPICAL OUTLOOK',
    desc: '48-hour tropical weather formation potential for the Atlantic Basin',
    src: `${NHC_BASE}/xgtwo/two_atl_2d0.png`,
    link: `${NHC_BASE}/gtwo.php`,
  },
  {
    title: '7-DAY TROPICAL OUTLOOK',
    desc: 'Extended tropical weather formation potential for the Atlantic Basin',
    src: `${NHC_BASE}/xgtwo/two_atl_5d0.png`,
    link: `${NHC_BASE}/gtwo.php`,
  },
  {
    title: 'ATLANTIC SATELLITE',
    desc: 'Real-time visible satellite loop of the Atlantic hurricane basin',
    src: `${NHC_BASE}/satellite/satellite_atl_loop-vis.gif`,
    link: `${NHC_BASE}/satellite.php`,
  },
  {
    title: 'SEA SURFACE TEMPERATURE',
    desc: 'Pacific sea surface temperature analysis — fuel for tropical development',
    src: `${NHC_BASE}/tafb/pac_sst.gif`,
    link: `${NHC_BASE}/tafb_latest.php`,
  },
];

export default function TropicalPage() {
  return (
    <PageWrapper>
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight font-mono uppercase">Tropical Tracker</h1>
          <p className="text-sm font-mono text-muted-foreground tracking-wider">// NHC OUTLOOKS // ATLANTIC BASIN // SATELLITE IMAGERY</p>
          <ShareButtons
            config={{
              title: 'Tropical Weather',
              text: 'Tropical weather -- NHC outlooks and satellite imagery at 16bitweather.co',
              url: 'https://www.16bitweather.co/tropical',
            }}
            className="mt-3 justify-center"
          />
        </div>

        {/* NHC Graphics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {graphics.map((g) => (
            <div key={g.title} className="border border-border rounded-lg overflow-hidden bg-card/30">
              <div className="p-4 border-b border-border">
                <h3 className="font-mono font-bold text-sm">{g.title}</h3>
                <p className="font-mono text-xs text-muted-foreground mt-1">{g.desc}</p>
              </div>
              <div className="relative aspect-[4/3] bg-black">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={g.src}
                  alt={g.title}
                  className="w-full h-full object-contain"
                  loading="lazy"
                />
              </div>
              <a
                href={g.link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-3 text-xs font-mono text-primary hover:bg-card/60 transition-colors border-t border-border"
              >
                <ExternalLink className="w-3 h-3" />
                VIEW ON NHC
              </a>
            </div>
          ))}
        </div>

        {/* Info */}
        <div className="border border-border rounded-lg p-6 bg-card/30 text-center">
          <p className="font-mono text-sm text-muted-foreground">
            Data sourced from the{' '}
            <a href={NHC_BASE} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-4">
              NOAA National Hurricane Center
            </a>
            . Atlantic hurricane season runs <span className="text-foreground font-bold">June 1 - November 30</span>.
            Eastern Pacific season runs <span className="text-foreground font-bold">May 15 - November 30</span>.
          </p>
        </div>
      </div>
    </PageWrapper>
  );
}
