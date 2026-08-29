/**
 * 16-Bit Weather Platform - Geomagnetic Tab
 *
 * Copyright (C) 2025 16-Bit Weather
 * Licensed under Fair Source License, Version 0.9
 *
 * Geomagnetic conditions and aurora forecast including Kp index gauge,
 * aurora forecast map, and space weather time series charts.
 */

'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { themeTokens } from '@/lib/theme-tokens';
import { Card, CardContent } from '@/components/ui/card';
import dynamic from 'next/dynamic';

import type { KpIndexData } from '../KpIndexGauge';
import type { AuroraForecastData } from '../AuroraForecastMap';

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
const KpIndexGauge = dynamic(() => import('../KpIndexGauge'), {
  loading: () => <LoadingSkeleton height="250px" />,
  ssr: false
});

const AuroraForecastMap = dynamic(() => import('../AuroraForecastMap'), {
  loading: () => <LoadingSkeleton height="400px" />,
  ssr: false
});

const SpaceWeatherCharts = dynamic(() => import('../SpaceWeatherCharts'), {
  loading: () => <LoadingSkeleton height="600px" />,
  ssr: false
});

interface GeomagneticTabProps {
  kpIndex: KpIndexData | null;
  auroraForecast: AuroraForecastData | null;
  isLoading?: boolean;
}

export default function GeomagneticTab({
  kpIndex,
  auroraForecast,
  isLoading = false
}: GeomagneticTabProps) {
  const themeClasses = themeTokens.weather;

  return (
    <div className={cn('space-y-4', themeClasses.background)}>
      {/* Kp Index and Aurora side by side on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className={cn('container-primary', themeClasses.background)}>
          <CardContent className="p-4">
            <KpIndexGauge data={kpIndex} isLoading={isLoading} />
          </CardContent>
        </Card>

        <Card className={cn('container-primary', themeClasses.background)}>
          <CardContent className="p-4">
            <AuroraForecastMap data={auroraForecast} isLoading={isLoading} />
          </CardContent>
        </Card>
      </div>

      {/* Space Weather Charts (includes Bz, Magnetometer, and other chart selections) */}
      <Card className={cn('container-primary', themeClasses.background)}>
        <CardContent className="p-4">
          <SpaceWeatherCharts />
        </CardContent>
      </Card>
    </div>
  );
}
