/**
 * 16-Bit Weather Platform - Solar Activity Tab
 *
 * Copyright (C) 2025 16-Bit Weather
 * Licensed under Fair Source License, Version 0.9
 *
 * Deep dive into solar activity including sun imagery, x-ray flux,
 * sunspot data, solar flare timeline, and coronagraph animation.
 */

'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { themeTokens } from '@/lib/theme-tokens';
import { Card, CardContent } from '@/components/ui/card';
import dynamic from 'next/dynamic';

import type { SunspotData } from '../SunspotDisplay';
import type { XRayFluxData } from '../XRayFluxChart';

// Loading skeleton component
function LoadingSkeleton({ height = '200px' }: { height?: string }) {
  return (
    <div
      className="flex items-center justify-center bg-gray-900 border-2 border-dashed border-gray-600 rounded"
      style={{ height }}
    >
      <div className="text-center text-gray-400 font-mono text-sm">
        <div className="animate-pulse">Loading...</div>
      </div>
    </div>
  );
}

// Dynamic imports for heavy components
const SunImageViewer = dynamic(() => import('../SunImageViewer'), {
  loading: () => <LoadingSkeleton height="400px" />,
  ssr: false
});

const XRayFluxChart = dynamic(() => import('../XRayFluxChart'), {
  loading: () => <LoadingSkeleton height="300px" />,
  ssr: false
});

const SunspotDisplay = dynamic(() => import('../SunspotDisplay'), {
  loading: () => <LoadingSkeleton height="200px" />,
  ssr: false
});

const SolarFlareTimeline = dynamic(() => import('../SolarFlareTimeline'), {
  loading: () => <LoadingSkeleton height="300px" />,
  ssr: false
});

const CoronagraphAnimation = dynamic(() => import('../CoronagraphAnimation'), {
  loading: () => <LoadingSkeleton height="400px" />,
  ssr: false
});

interface SolarActivityTabProps {
  xrayFlux: XRayFluxData | null;
  sunspots: SunspotData | null;
  isLoading?: boolean;
}

export default function SolarActivityTab({
  xrayFlux,
  sunspots,
  isLoading = false
}: SolarActivityTabProps) {
  const themeClasses = themeTokens.weather;

  return (
    <div className={cn('space-y-4', themeClasses.background)}>
      {/* Sun Image - full width at top */}
      <Card className={cn('container-primary', themeClasses.background)}>
        <CardContent className="p-4">
          <SunImageViewer />
        </CardContent>
      </Card>

      {/* X-Ray Flux and Sunspots - 2-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className={cn('container-primary', themeClasses.background)}>
          <CardContent className="p-4">
            <XRayFluxChart data={xrayFlux} isLoading={isLoading} />
          </CardContent>
        </Card>

        <Card className={cn('container-primary', themeClasses.background)}>
          <CardContent className="p-4">
            <SunspotDisplay data={sunspots} isLoading={isLoading} />
          </CardContent>
        </Card>
      </div>

      {/* Solar Flare Timeline */}
      <Card className={cn('container-primary', themeClasses.background)}>
        <CardContent className="p-4">
          <SolarFlareTimeline />
        </CardContent>
      </Card>

      {/* Coronagraph Animation */}
      <Card className={cn('container-primary', themeClasses.background)}>
        <CardContent className="p-4">
          <CoronagraphAnimation />
        </CardContent>
      </Card>
    </div>
  );
}
