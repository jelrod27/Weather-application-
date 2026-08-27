/**
 * 16-Bit Weather Platform - Solar Command Terminal
 *
 * Copyright (C) 2025 16-Bit Weather
 * Licensed under Fair Source License, Version 0.9
 *
 * Main space weather dashboard with tabbed navigation.
 * Organizes 13 space weather components into 5 themed tabs.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Sun, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { themeTokens } from '@/lib/theme-tokens';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import dynamic from 'next/dynamic';
import SpaceWeatherNav, { type SpaceWeatherTabId } from './SpaceWeatherNav';

// Lazy load tab panels
const CommandCenterTab = dynamic(() => import('./tabs/CommandCenterTab'), {
  loading: () => <TabSkeleton />,
  ssr: false,
});
const SolarActivityTab = dynamic(() => import('./tabs/SolarActivityTab'), {
  loading: () => <TabSkeleton />,
  ssr: false,
});
const GeomagneticTab = dynamic(() => import('./tabs/GeomagneticTab'), {
  loading: () => <TabSkeleton />,
  ssr: false,
});
const SolarWindTab = dynamic(() => import('./tabs/SolarWindTab'), {
  loading: () => <TabSkeleton />,
  ssr: false,
});
const AlertsForecastTab = dynamic(() => import('./tabs/AlertsForecastTab'), {
  loading: () => <TabSkeleton />,
  ssr: false,
});

function TabSkeleton() {
  return (
    <div className="flex items-center justify-center bg-gray-900/50 border border-dashed border-gray-700 rounded min-h-[400px]">
      <div className="text-center text-gray-400 font-mono text-sm animate-pulse">
        LOADING MODULE...
      </div>
    </div>
  );
}

import type { SpaceWeatherAlert } from './SpaceWeatherAlertTicker';
import type { KpIndexData } from './KpIndexGauge';
import type { SolarWindData } from './SolarWindStats';
import type { SunspotData } from './SunspotDisplay';
import type { XRayFluxData } from './XRayFluxChart';
import type { AuroraForecastData } from './AuroraForecastMap';
import type { SpaceWeatherScalesData } from './SpaceWeatherScales';

interface SolarCommandTerminalProps {
  scales: SpaceWeatherScalesData | null;
  alerts: SpaceWeatherAlert[];
  kpIndex: KpIndexData | null;
  solarWind: SolarWindData | null;
  sunspots: SunspotData | null;
  xrayFlux: XRayFluxData | null;
  auroraForecast: AuroraForecastData | null;
  isLoading?: boolean;
}

export default function SolarCommandTerminal({
  scales,
  alerts,
  kpIndex,
  solarWind,
  sunspots,
  xrayFlux,
  auroraForecast,
  isLoading = false,
}: SolarCommandTerminalProps) {
  const themeClasses = themeTokens.weather;
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState<SpaceWeatherTabId>('command');

  useEffect(() => {
    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 10000);
    return () => clearInterval(timer);
  }, []);

  const formatZuluTime = (date: Date) => date.toISOString().slice(11, 19) + 'Z';
  const formatLocalTime = (date: Date) => date.toLocaleTimeString('en-US', { hour12: false });

  const getOverallStatus = () => {
    const kp = kpIndex?.current?.value ?? 0;
    const rScale = scales?.R?.scale ?? 0;
    const sScale = scales?.S?.scale ?? 0;
    const gScale = scales?.G?.scale ?? 0;

    const hasStorm = kp >= 5 || rScale >= 3 || sScale >= 3 || gScale >= 3;
    const hasActivity = kp >= 4 || rScale >= 1 || sScale >= 1 || gScale >= 1;

    if (hasStorm) return { text: 'STORM CONDITIONS', color: 'text-red-500', bgColor: 'bg-red-500/20' };
    if (hasActivity) return { text: 'ACTIVE', color: 'text-yellow-500', bgColor: 'bg-yellow-500/20' };
    return { text: 'QUIET', color: 'text-green-500', bgColor: 'bg-green-500/20' };
  };

  const status = getOverallStatus();

  const scaleColor = (val: number) => {
    if (val >= 4) return 'text-red-500';
    if (val >= 3) return 'text-orange-500';
    if (val >= 1) return 'text-yellow-500';
    return 'text-green-500';
  };

  return (
    <div className={cn('space-y-4', themeClasses.background)}>
      {/* Terminal Header + Status Bar */}
      <Card className={cn('container-primary', themeClasses.background)}>
        <CardHeader className="border-b border-subtle py-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <CardTitle className={cn('text-xl font-mono font-bold flex items-center gap-2', themeClasses.headerText)}>
              <Sun className="w-6 h-6 text-yellow-500" />
              SOLAR COMMAND TERMINAL
              <span className={cn('text-xs px-2 py-0.5 border-2', status.bgColor, status.color, 'border-current')}>
                {status.text}
              </span>
            </CardTitle>
            <div className="flex items-center gap-4 font-mono text-xs">
              <div className={cn('flex items-center gap-1', themeClasses.text)}>
                <Clock className="w-3 h-3" />
                <span>UTC: {currentTime ? formatZuluTime(currentTime) : '--:--:--Z'}</span>
              </div>
              <div className={cn('flex items-center gap-1', themeClasses.text)}>
                <span>LOCAL: {currentTime ? formatLocalTime(currentTime) : '--:--:--'}</span>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="py-3">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            <StatusCell label="Kp Index" value={kpIndex?.current?.value?.toFixed(0) ?? '—'} color={themeClasses.accentText} />
            <StatusCell label="Sunspots" value={sunspots?.current?.sunspotNumber?.toString() ?? '—'} color="text-yellow-500" />
            <StatusCell label="Wind km/s" value={solarWind?.current?.speed?.toString() ?? '—'} color="text-cyan-500" />
            <StatusCell label="Alerts" value={alerts.length > 0 ? alerts.length.toString() : 'OK'} color={alerts.length > 0 ? 'text-orange-500' : 'text-green-500'} />
            <StatusCell label="R Scale" value={scales?.R?.scale?.toString() ?? '—'} color={scaleColor(scales?.R?.scale ?? 0)} />
            <StatusCell label="S Scale" value={scales?.S?.scale?.toString() ?? '—'} color={scaleColor(scales?.S?.scale ?? 0)} />
            <StatusCell label="G Scale" value={scales?.G?.scale?.toString() ?? '—'} color={scaleColor(scales?.G?.scale ?? 0)} />
          </div>
        </CardContent>
      </Card>

      {/* Tab Navigation */}
      <SpaceWeatherNav activeTab={activeTab} onTabChange={(tab) => setActiveTab(tab)} />

      {/* Tab Content */}
      <div className="min-h-[500px]">
        {activeTab === 'command' && (
          <div id="panel-command" role="tabpanel" aria-labelledby="tab-command">
            <CommandCenterTab
              scales={scales}
              alerts={alerts}
              kpIndex={kpIndex}
              solarWind={solarWind}
              sunspots={sunspots}
              xrayFlux={xrayFlux}
              auroraForecast={auroraForecast}
              isLoading={isLoading}
            />
          </div>
        )}
        {activeTab === 'solar' && (
          <div id="panel-solar" role="tabpanel" aria-labelledby="tab-solar">
            <SolarActivityTab
              xrayFlux={xrayFlux}
              sunspots={sunspots}
              isLoading={isLoading}
            />
          </div>
        )}
        {activeTab === 'geomagnetic' && (
          <div id="panel-geomagnetic" role="tabpanel" aria-labelledby="tab-geomagnetic">
            <GeomagneticTab
              kpIndex={kpIndex}
              auroraForecast={auroraForecast}
              isLoading={isLoading}
            />
          </div>
        )}
        {activeTab === 'wind' && (
          <div id="panel-wind" role="tabpanel" aria-labelledby="tab-wind">
            <SolarWindTab
              solarWind={solarWind}
              isLoading={isLoading}
            />
          </div>
        )}
        {activeTab === 'alerts' && (
          <div id="panel-alerts" role="tabpanel" aria-labelledby="tab-alerts">
            <AlertsForecastTab
              scales={scales}
              alerts={alerts}
              kpIndex={kpIndex}
              isLoading={isLoading}
            />
          </div>
        )}
      </div>

      {/* Footer */}
      <div className={cn(
        'text-center text-xs font-mono py-3 border-t border-subtle',
        themeClasses.text
      )}>
        DATA PROVIDED BY NOAA SWPC, NASA SDO, ESA/NASA SOHO // FOR EDUCATIONAL USE // CHECK OFFICIAL SOURCES FOR CRITICAL DECISIONS
      </div>
    </div>
  );
}

function StatusCell({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="text-center p-2 container-nested">
      <div className={cn('text-xl font-bold font-mono', color)}>{value}</div>
      <div className="text-xs font-mono uppercase text-muted-foreground">{label}</div>
    </div>
  );
}
