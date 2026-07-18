/**
 * 16-Bit Weather Platform - Current Conditions Component
 *
 * Copyright (C) 2025 16-Bit Weather
 * Licensed under Fair Source License, Version 0.9
 *
 * Compact grid showing current space weather conditions at a glance
 */

'use client';

import React from 'react';
import { Activity, Wind, Zap, Sun, Sparkles, ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/components/theme-provider';
import { getComponentStyles, type ThemeType } from '@/lib/theme-utils';
import type { KpIndexData } from './KpIndexGauge';
import type { SolarWindData } from './SolarWindStats';
import type { XRayFluxData } from './XRayFluxChart';
import type { SunspotData } from './SunspotDisplay';
import type { AuroraForecastData } from './AuroraForecastMap';

interface CurrentConditionsProps {
  kpIndex: KpIndexData | null;
  solarWind: SolarWindData | null;
  xrayFlux: XRayFluxData | null;
  sunspots: SunspotData | null;
  auroraForecast: AuroraForecastData | null;
}

function getKpLabel(kp: number): { text: string; color: string } {
  if (kp < 4) return { text: 'QUIET', color: 'text-green-500' };
  if (kp < 5) return { text: 'ACTIVE', color: 'text-yellow-500' };
  return { text: 'STORM', color: 'text-red-500' };
}

function getBzColor(bz: number): string {
  if (bz > 0) return 'text-green-500';
  if (bz > -5) return 'text-yellow-500';
  return 'text-red-500';
}

function getPhaseLabel(phase: string): string {
  switch (phase) {
    case 'rising': return 'RISING';
    case 'maximum': return 'MAXIMUM';
    case 'declining': return 'DECLINING';
    case 'minimum': return 'MINIMUM';
    default: return phase.toUpperCase();
  }
}

function TrendArrow({ trend }: { trend: string }) {
  switch (trend) {
    case 'increasing':
      return <ArrowUp className="w-3 h-3 text-red-500" />;
    case 'decreasing':
      return <ArrowDown className="w-3 h-3 text-green-500" />;
    default:
      return <Minus className="w-3 h-3 text-gray-500" />;
  }
}

export default function CurrentConditions({
  kpIndex,
  solarWind,
  xrayFlux,
  sunspots,
  auroraForecast,
}: CurrentConditionsProps) {
  const { theme } = useTheme();
  const themeClasses = getComponentStyles((theme || 'nord') as ThemeType, 'weather');

  const kp = kpIndex?.current?.value ?? 0;
  const kpStatus = getKpLabel(kp);
  const windSpeed = solarWind?.current?.speed ?? 0;
  const bz = solarWind?.current?.bz ?? null;
  const bzColor = bz == null ? 'text-gray-400' : getBzColor(bz);
  const classification =
    xrayFlux?.current?.flareClass
    ?? xrayFlux?.current?.classification
    ?? 'A';
  const subClass = xrayFlux?.current?.subClass
    ?? (xrayFlux?.current?.classNumber
      ? parseFloat(xrayFlux.current.classNumber.replace(/^[A-Z]/i, '')) || 0
      : 0);
  const sunspotCount = sunspots?.current?.sunspotNumber ?? 0;
  const cyclePhase = sunspots?.solarCycle?.phase ?? 'unknown';
  const viewLatitude = auroraForecast?.viewline?.latitude;
  const hemisphere = auroraForecast?.hemisphere === 'south' ? 'S' : 'N';
  const viewDescription = auroraForecast?.viewline?.description ?? 'N/A';

  return (
    <div className={cn(
      'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3',
      themeClasses.background
    )}>
      {/* Kp Index */}
      <div className="p-3 card-inner rounded">
        <div className={cn('flex items-center gap-1 mb-1', themeClasses.text)}>
          <Activity className="w-3 h-3" aria-hidden="true" />
          <span className="text-xs font-mono uppercase">Kp Index</span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className={cn('text-2xl font-bold font-mono', kpStatus.color)}>
            {kp}
          </span>
          <span className={cn('text-xs font-mono', kpStatus.color)}>
            {kpStatus.text}
          </span>
        </div>
      </div>

      {/* Solar Wind */}
      <div className="p-3 card-inner rounded">
        <div className={cn('flex items-center gap-1 mb-1', themeClasses.text)}>
          <Wind className="w-3 h-3" aria-hidden="true" />
          <span className="text-xs font-mono uppercase">Solar Wind</span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className={cn('text-2xl font-bold font-mono', themeClasses.accentText)}>
            {windSpeed}
          </span>
          <span className={cn('text-xs font-mono', themeClasses.text)}>km/s</span>
          {solarWind?.trend && <TrendArrow trend={solarWind.trend} />}
        </div>
      </div>

      {/* Bz Component */}
      <div className="p-3 card-inner rounded">
        <div className={cn('flex items-center gap-1 mb-1', themeClasses.text)}>
          <Activity className="w-3 h-3" aria-hidden="true" />
          <span className="text-xs font-mono uppercase">Bz Component</span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className={cn('text-2xl font-bold font-mono', bzColor)}>
            {bz == null ? '--' : `${bz > 0 ? '+' : ''}${bz.toFixed(1)}`}
          </span>
          <span className={cn('text-xs font-mono', themeClasses.text)}>nT</span>
          <span className={cn('text-xs font-mono', bzColor)}>
            {bz == null ? 'N/A' : bz > 0 ? 'NORTH' : 'SOUTH'}
          </span>
        </div>
      </div>

      {/* X-Ray Flux */}
      <div className="p-3 card-inner rounded">
        <div className={cn('flex items-center gap-1 mb-1', themeClasses.text)}>
          <Zap className="w-3 h-3" aria-hidden="true" />
          <span className="text-xs font-mono uppercase">X-Ray Flux</span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className={cn('text-2xl font-bold font-mono', themeClasses.accentText)}>
            {classification}{subClass.toFixed(1)}
          </span>
          {xrayFlux?.peak24h && (
            <span className={cn('text-xs font-mono', themeClasses.text)}>
              24h: {xrayFlux.peak24h.classification}{xrayFlux.peak24h.subClass.toFixed(1)}
            </span>
          )}
        </div>
      </div>

      {/* Sunspots */}
      <div className="p-3 card-inner rounded">
        <div className={cn('flex items-center gap-1 mb-1', themeClasses.text)}>
          <Sun className="w-3 h-3" aria-hidden="true" />
          <span className="text-xs font-mono uppercase">Sunspots</span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className={cn('text-2xl font-bold font-mono text-yellow-500')}>
            {sunspotCount}
          </span>
          <span className={cn('text-xs font-mono', themeClasses.text)}>
            {getPhaseLabel(cyclePhase)}
          </span>
        </div>
      </div>

      {/* Aurora */}
      <div className="p-3 card-inner rounded">
        <div className={cn('flex items-center gap-1 mb-1', themeClasses.text)}>
          <Sparkles className="w-3 h-3" aria-hidden="true" />
          <span className="text-xs font-mono uppercase">Aurora</span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className={cn('text-2xl font-bold font-mono text-green-400')}>
            {viewLatitude != null ? `${viewLatitude}°${hemisphere}` : '--'}
          </span>
        </div>
        <div className={cn('text-xs font-mono mt-0.5', themeClasses.text, 'opacity-80')}>
          {viewDescription}
        </div>
      </div>
    </div>
  );
}
