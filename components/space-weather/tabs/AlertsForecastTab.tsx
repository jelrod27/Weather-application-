/**
 * 16-Bit Weather Platform - Alerts & Forecast Tab
 *
 * Copyright (C) 2025 16-Bit Weather
 * Licensed under Fair Source License, Version 0.9
 *
 * Alerts, forecasts, and NOAA space weather scales including detailed
 * scale breakdowns, active alerts, solar flare timeline, and Kp forecast data.
 */

'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { themeTokens } from '@/lib/theme-tokens';
import { Card, CardContent } from '@/components/ui/card';
import dynamic from 'next/dynamic';

import type { SpaceWeatherScalesData } from '../SpaceWeatherScales';
import type { SpaceWeatherAlert } from '../SpaceWeatherAlertTicker';
import type { KpIndexData } from '../KpIndexGauge';

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
const SpaceWeatherScales = dynamic(() => import('../SpaceWeatherScales'), {
  loading: () => <LoadingSkeleton height="200px" />,
  ssr: false
});

const SpaceWeatherAlertTicker = dynamic(() => import('../SpaceWeatherAlertTicker'), {
  loading: () => <LoadingSkeleton height="150px" />,
  ssr: false
});

const SolarFlareTimeline = dynamic(() => import('../SolarFlareTimeline'), {
  loading: () => <LoadingSkeleton height="300px" />,
  ssr: false
});

const KpIndexGauge = dynamic(() => import('../KpIndexGauge'), {
  loading: () => <LoadingSkeleton height="250px" />,
  ssr: false
});

interface AlertsForecastTabProps {
  scales: SpaceWeatherScalesData | null;
  alerts: SpaceWeatherAlert[];
  kpIndex: KpIndexData | null;
  isLoading?: boolean;
}

export default function AlertsForecastTab({
  scales,
  alerts,
  kpIndex,
  isLoading = false
}: AlertsForecastTabProps) {
  const themeClasses = themeTokens.weather;

  return (
    <div className={cn('space-y-4', themeClasses.background)}>
      {/* NOAA Space Weather Scales - full detailed version */}
      <Card className={cn('container-primary', themeClasses.background)}>
        <CardContent className="p-4">
          <SpaceWeatherScales scales={scales} isLoading={isLoading} />
        </CardContent>
      </Card>

      {/* Active Alerts */}
      <Card className={cn('container-primary', themeClasses.background)}>
        <CardContent className="p-4">
          <div className={cn('text-sm font-mono font-bold uppercase mb-3', themeClasses.headerText)}>
            Active Alerts ({alerts.length})
          </div>
          {alerts.length > 0 ? (
            <SpaceWeatherAlertTicker alerts={alerts} isLoading={isLoading} />
          ) : (
            <div className={cn('text-center py-6 font-mono text-sm', themeClasses.text)}>
              <div className="text-green-500 text-lg font-bold mb-1">ALL CLEAR</div>
              <div>No active space weather alerts at this time.</div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Solar Flare Timeline */}
      <Card className={cn('container-primary', themeClasses.background)}>
        <CardContent className="p-4">
          <SolarFlareTimeline />
        </CardContent>
      </Card>

      {/* Kp Forecast Section */}
      <Card className={cn('container-primary', themeClasses.background)}>
        <CardContent className="p-4">
          <div className={cn('text-sm font-mono font-bold uppercase mb-3', themeClasses.headerText)}>
            Kp Index Forecast
          </div>
          <KpIndexGauge data={kpIndex} isLoading={isLoading} />
        </CardContent>
      </Card>
    </div>
  );
}
