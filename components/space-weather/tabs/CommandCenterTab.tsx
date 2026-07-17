/**
 * 16-Bit Weather Platform - Command Center Tab
 *
 * Copyright (C) 2025 16-Bit Weather
 * Licensed under Fair Source License, Version 0.9
 *
 * Overview/dashboard tab providing an "at a glance" view of space weather conditions.
 * Renders current conditions, sun imagery, active alerts, and compact NOAA scales.
 */

'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/components/theme-provider';
import { getComponentStyles, type ThemeType } from '@/lib/theme-utils';
import { Card, CardContent } from '@/components/ui/card';
import dynamic from 'next/dynamic';

import type { SpaceWeatherScalesData } from '../SpaceWeatherScales'; // used by CompactScales prop type
import type { SpaceWeatherAlert } from '../SpaceWeatherAlertTicker';
import type { KpIndexData } from '../KpIndexGauge';
import type { SolarWindData } from '../SolarWindStats';
import type { SunspotData } from '../SunspotDisplay';
import type { XRayFluxData } from '../XRayFluxChart';
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
const SunImageViewer = dynamic(() => import('../SunImageViewer'), {
  loading: () => <LoadingSkeleton height="350px" />,
  ssr: false
});

const SpaceWeatherAlertTicker = dynamic(() => import('../SpaceWeatherAlertTicker'), {
  loading: () => <LoadingSkeleton height="150px" />,
  ssr: false
});

const CompactScales = dynamic(() => import('../CompactScales'), {
  loading: () => <LoadingSkeleton height="60px" />,
  ssr: false
});

interface CommandCenterTabProps {
  scales: SpaceWeatherScalesData | null;
  alerts: SpaceWeatherAlert[];
  kpIndex: KpIndexData | null;
  solarWind: SolarWindData | null;
  sunspots: SunspotData | null;
  xrayFlux: XRayFluxData | null;
  auroraForecast: AuroraForecastData | null;
  isLoading?: boolean;
}

export default function CommandCenterTab({
  scales,
  alerts,
  kpIndex,
  solarWind,
  sunspots,
  xrayFlux,
  auroraForecast,
  isLoading = false
}: CommandCenterTabProps) {
  const { theme } = useTheme();
  const themeClasses = getComponentStyles((theme || 'nord') as ThemeType, 'weather');

  return (
    <div className={cn('space-y-4', themeClasses.background)}>
      {/* Main layout: 2-column on desktop, stacked on mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Sun Image - left column on desktop */}
        <Card className={cn('container-primary', themeClasses.background)}>
          <CardContent className="p-4">
            <div className="overflow-hidden max-h-[420px]">
              <SunImageViewer />
            </div>
          </CardContent>
        </Card>

        {/* Current Conditions - right column on desktop */}
        <Card className={cn('container-primary', themeClasses.background)}>
          <CardContent className="p-4">
            <div className={cn('text-sm font-mono font-bold uppercase mb-3', themeClasses.headerText)}>
              Current Conditions
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className={cn('text-center p-3 container-nested')}>
                <div className={cn('text-2xl font-bold font-mono', themeClasses.accentText)}>
                  {kpIndex?.current?.value?.toFixed(0) ?? '--'}
                </div>
                <div className={cn('text-xs font-mono uppercase', themeClasses.text)}>
                  Kp Index
                </div>
              </div>
              <div className={cn('text-center p-3 container-nested')}>
                <div className="text-2xl font-bold font-mono text-yellow-500">
                  {sunspots?.current?.sunspotNumber ?? '--'}
                </div>
                <div className={cn('text-xs font-mono uppercase', themeClasses.text)}>
                  Sunspots
                </div>
              </div>
              <div className={cn('text-center p-3 container-nested')}>
                <div className="text-2xl font-bold font-mono text-cyan-500">
                  {solarWind?.current?.speed ?? '--'}
                </div>
                <div className={cn('text-xs font-mono uppercase', themeClasses.text)}>
                  Wind km/s
                </div>
              </div>
              <div className={cn('text-center p-3 container-nested')}>
                <div className={cn(
                  'text-2xl font-bold font-mono',
                  alerts.length > 0 ? 'text-orange-500' : 'text-green-500'
                )}>
                  {alerts.length > 0 ? alerts.length : 'OK'}
                </div>
                <div className={cn('text-xs font-mono uppercase', themeClasses.text)}>
                  Alerts
                </div>
              </div>
              <div className={cn('text-center p-3 container-nested')}>
                <div className="text-2xl font-bold font-mono text-purple-500">
                  {xrayFlux?.current?.classNumber
                    ?? xrayFlux?.current?.flareClass
                    ?? xrayFlux?.current?.classification
                    ?? '--'}
                </div>
                <div className={cn('text-xs font-mono uppercase', themeClasses.text)}>
                  X-Ray Flux
                </div>
              </div>
              <div className={cn('text-center p-3 container-nested')}>
                <div className="text-2xl font-bold font-mono text-green-400">
                  {auroraForecast?.viewline?.description?.split(' ')[0] ?? '--'}
                </div>
                <div className={cn('text-xs font-mono uppercase', themeClasses.text)}>
                  Aurora
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts section (only shown if alerts exist) */}
      {alerts.length > 0 && (
        <Card className={cn('container-primary', themeClasses.background)}>
          <CardContent className="p-0">
            <SpaceWeatherAlertTicker alerts={alerts} isLoading={isLoading} />
          </CardContent>
        </Card>
      )}

      {/* Compact NOAA Scales */}
      <CompactScales data={scales} />
    </div>
  );
}
