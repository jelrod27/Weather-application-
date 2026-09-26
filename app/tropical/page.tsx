/**
 * 16-Bit Weather Platform - Tropical Tracker Page
 *
 * NHC tropical outlooks, satellite imagery, and hurricane season info.
 * Official imagery with source-file update times and recoverable image loading.
 */
import React from 'react';
import PageWrapper from '@/components/page-wrapper';
import TropicalGraphic from '@/components/tropical/tropical-graphic';
import { TROPICAL_GRAPHICS, getGraphicUpdatedAt } from '@/lib/tropical/graphics';
import { ShareButtons } from '@/components/share-buttons';

const NHC_BASE = 'https://www.nhc.noaa.gov';

export default async function TropicalPage(): Promise<React.JSX.Element> {
  const updates = await Promise.all(TROPICAL_GRAPHICS.map((graphic) => getGraphicUpdatedAt(graphic.src)));
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
          {TROPICAL_GRAPHICS.map((graphic, index) => (
            <TropicalGraphic key={graphic.title} graphic={graphic} updatedAt={updates[index]} />
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
