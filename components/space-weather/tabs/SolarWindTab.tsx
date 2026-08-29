/**
 * 16-Bit Weather Platform - Solar Wind Tab
 *
 * Copyright (C) 2025 16-Bit Weather
 * Licensed under Fair Source License, Version 0.9
 *
 * Solar wind monitoring including the WSA-ENLIL model viewer,
 * real-time solar wind statistics, and time series charts.
 */

'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { themeTokens } from '@/lib/theme-tokens';
import { Card, CardContent } from '@/components/ui/card';
import dynamic from 'next/dynamic';

import type { SolarWindData } from '../SolarWindStats';

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
const EnlilModelViewer = dynamic(() => import('../EnlilModelViewer'), {
  loading: () => <LoadingSkeleton height="500px" />,
  ssr: false
});

const SolarWindStats = dynamic(() => import('../SolarWindStats'), {
  loading: () => <LoadingSkeleton height="250px" />,
  ssr: false
});

const SpaceWeatherCharts = dynamic(() => import('../SpaceWeatherCharts'), {
  loading: () => <LoadingSkeleton height="600px" />,
  ssr: false
});

interface SolarWindTabProps {
  solarWind: SolarWindData | null;
  isLoading?: boolean;
}

export default function SolarWindTab({
  solarWind,
  isLoading = false
}: SolarWindTabProps) {
  const themeClasses = themeTokens.weather;

  return (
    <div className={cn('space-y-4', themeClasses.background)}>
      {/* ENLIL Model - prominent at top */}
      <Card className={cn('container-primary', themeClasses.background)}>
        <CardContent className="p-4">
          <EnlilModelViewer />
        </CardContent>
      </Card>

      {/* Solar Wind Stats */}
      <Card className={cn('container-primary', themeClasses.background)}>
        <CardContent className="p-4">
          <SolarWindStats data={solarWind} isLoading={isLoading} />
        </CardContent>
      </Card>

      {/* Time Series Charts */}
      <Card className={cn('container-primary', themeClasses.background)}>
        <CardContent className="p-4">
          <SpaceWeatherCharts />
        </CardContent>
      </Card>
    </div>
  );
}
