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
import { viewlineFor } from '@/lib/space-weather/kp-scale';
import { cn } from '@/lib/utils';
import { themeTokens } from '@/lib/theme-tokens';
import { Card, CardContent } from '@/components/ui/card';
import SunImageViewer from '../SunImageViewer';
import SpaceWeatherAlertTicker from '../SpaceWeatherAlertTicker';
import CompactScales from '../CompactScales';

import type { SpaceWeatherScalesData } from '../SpaceWeatherScales'; // used by CompactScales prop type
import type { SpaceWeatherAlert } from '../SpaceWeatherAlertTicker';
import type { KpIndexData } from '../KpIndexGauge';
import type { SolarWindData } from '../SolarWindStats';
import type { SunspotData } from '../SunspotDisplay';
import type { XRayFluxData } from '../XRayFluxChart';
import type { AuroraForecastData } from '../AuroraForecastMap';


interface CommandCenterTabProps {
  scales: SpaceWeatherScalesData | null;
  alerts: SpaceWeatherAlert[];
  alertsAvailable: boolean;
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
  alertsAvailable,
  kpIndex,
  solarWind,
  sunspots,
  xrayFlux,
  auroraForecast,
  isLoading = false
}: CommandCenterTabProps): React.ReactElement {
  const themeClasses = themeTokens.weather;
  const viewline = viewlineFor(auroraForecast?.currentKp ?? kpIndex?.current?.value, auroraForecast?.hemisphere);

  return (
    <div className={cn('space-y-4', themeClasses.background)}>
      {/* Main layout: 2-column on desktop, stacked on mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Sun Image - left column on desktop */}
        <SunImageViewer />

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
                <div className="text-2xl font-bold font-mono text-[var(--sw-warning)]">
                  {sunspots?.current?.sunspotNumber ?? '--'}
                </div>
                <div className={cn('text-xs font-mono uppercase', themeClasses.text)}>
                  Sunspots
                </div>
              </div>
              <div className={cn('text-center p-3 container-nested')}>
                <div className="text-2xl font-bold font-mono text-[var(--sw-info)]">
                  {solarWind?.current?.speed ?? '--'}
                </div>
                <div className={cn('text-xs font-mono uppercase', themeClasses.text)}>
                  Wind km/s
                </div>
              </div>
              <div className={cn('text-center p-3 container-nested')}>
                <div className={cn(
                  'text-2xl font-bold font-mono',
                  'text-muted-foreground'
                )}>
                  {alertsAvailable ? alerts.length : '—'}
                </div>
                <div className={cn('text-xs font-mono uppercase', themeClasses.text)}>
                  Recent messages
                </div>
              </div>
              <div className={cn('text-center p-3 container-nested')}>
                <div className="text-2xl font-bold font-mono text-[var(--sw-purple)]">
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
                <div className="text-2xl font-bold font-mono text-[var(--sw-success)]">
                  {viewline ? `~${viewline.latitude}°${auroraForecast?.hemisphere === 'south' ? 'S' : 'N'}` : '--'}
                </div>
                <div className={cn('text-xs font-mono uppercase', themeClasses.text)}>
                  Aurora (approx.)
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts section also explains when the feed is unavailable. */}
      <Card className={cn('container-primary', themeClasses.background)}>
        <CardContent className="p-0">
          <SpaceWeatherAlertTicker alerts={alerts} isLoading={isLoading} unavailable={!alertsAvailable} />
        </CardContent>
      </Card>

      {/* Compact NOAA Scales */}
      <CompactScales data={scales} />
    </div>
  );
}
