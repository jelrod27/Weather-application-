/**
 * 16-Bit Weather Platform - Solar Wind Stats Component
 *
 * Copyright (C) 2025 16-Bit Weather
 * Licensed under Fair Source License, Version 0.9
 *
 * Displays real-time solar wind parameters (speed, density, Bz)
 */

'use client';

import React from 'react';
import { Wind, ArrowUp, ArrowDown, Minus, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { themeTokens } from '@/lib/theme-tokens';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export interface SolarWindData {
  current: {
    speed: number; // km/s
    density: number | null; // particles/cm³
    temperature: number | null; // K
    bz: number | null; // nT; null when mag feed unavailable
    bt: number | null; // nT
  };
  trend: 'increasing' | 'decreasing' | 'stable';
}

interface SolarWindStatsProps {
  data: SolarWindData | null;
  isLoading?: boolean;
}

// Get speed status
function getSpeedStatus(speed: number): { text: string; color: string } {
  if (speed < 350) return { text: 'SLOW', color: 'text-[var(--sw-success)]' };
  if (speed < 450) return { text: 'NORMAL', color: 'text-[var(--sw-success)]' };
  if (speed < 550) return { text: 'ELEVATED', color: 'text-[var(--sw-warning)]' };
  if (speed < 700) return { text: 'HIGH', color: 'text-[var(--sw-orange)]' };
  return { text: 'EXTREME', color: 'text-[var(--sw-danger)]' };
}

// Get Bz status (negative = southward = geomagnetically active)
function getBzStatus(bz: number): { text: string; color: string; isWarning: boolean } {
  if (bz > 2) return { text: 'NORTH', color: 'text-[var(--sw-success)]', isWarning: false };
  if (bz > -2) return { text: 'NEUTRAL', color: 'text-muted-foreground', isWarning: false };
  if (bz > -5) return { text: 'SOUTH', color: 'text-[var(--sw-warning)]', isWarning: true };
  if (bz > -10) return { text: 'STRONG SOUTH', color: 'text-[var(--sw-orange)]', isWarning: true };
  return { text: 'EXTREME SOUTH', color: 'text-[var(--sw-danger)]', isWarning: true };
}

// Get density status
function getDensityStatus(density: number): { text: string; color: string } {
  if (density < 3) return { text: 'LOW', color: 'text-muted-foreground' };
  if (density < 8) return { text: 'NORMAL', color: 'text-[var(--sw-success)]' };
  if (density < 15) return { text: 'ELEVATED', color: 'text-[var(--sw-warning)]' };
  return { text: 'HIGH', color: 'text-[var(--sw-orange)]' };
}

// Get trend icon
function TrendIcon({ trend }: { trend: SolarWindData['trend'] }) {
  switch (trend) {
    case 'increasing':
      return <ArrowUp className="w-4 h-4 text-[var(--sw-danger)]" />;
    case 'decreasing':
      return <ArrowDown className="w-4 h-4 text-[var(--sw-success)]" />;
    default:
      return <Minus className="w-4 h-4 text-muted-foreground" />;
  }
}

export default function SolarWindStats({ data, isLoading = false }: SolarWindStatsProps): React.ReactElement {
  const themeClasses = themeTokens.weather;

  if (isLoading) {
    return (
      <Card className={cn('container-primary', themeClasses.background)}>
        <CardHeader className={'border-b border-subtle py-3'}>
          <CardTitle className={cn('text-lg font-mono font-bold', themeClasses.headerText)}>
            SOLAR WIND
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="animate-pulse space-y-3">
            <div className="h-12 bg-gray-700 rounded" />
            <div className="h-12 bg-gray-700 rounded" />
            <div className="h-12 bg-gray-700 rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const speed = data?.current?.speed ?? null;
  const density = data?.current?.density ?? null;
  const bz = data?.current?.bz ?? null;
  const bt = data?.current?.bt ?? null;

  const unavailable = { text: 'UNAVAILABLE', color: 'text-muted-foreground' };
  const speedStatus = speed === null ? unavailable : getSpeedStatus(speed);
  const bzStatus =
    bz == null
      ? { text: 'UNAVAILABLE', color: 'text-muted-foreground', isWarning: false }
      : getBzStatus(bz);
  const densityStatus = density === null ? unavailable : getDensityStatus(density);

  return (
    <Card className={cn('container-primary', themeClasses.background)}>
      <CardHeader className={'border-b border-subtle py-3'}>
        <div className="flex items-center justify-between">
          <CardTitle className={cn('text-lg font-mono font-bold flex items-center gap-2', themeClasses.headerText)}>
            <Wind className="w-5 h-5 text-[var(--sw-info)]" />
            SOLAR WIND
          </CardTitle>
          {data?.trend && (
            <div className="flex items-center gap-1">
              <TrendIcon trend={data.trend} />
              <span className={cn('text-xs font-mono uppercase', themeClasses.text)}>
                {data.trend}
              </span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        {/* Speed */}
        <div className={'p-3 card-inner rounded flex items-center justify-between'}>
          <div>
            <div className={cn('text-xs font-mono uppercase mb-1', themeClasses.text)}>
              SPEED
            </div>
            <div className="flex items-baseline gap-2">
              <span className={cn('text-2xl font-bold font-mono', speedStatus.color)}>
                {speed ?? '--'}
              </span>
              <span className={cn('text-xs font-mono', themeClasses.text)}>km/s</span>
            </div>
          </div>
          <div className={cn('text-xs font-mono px-2 py-1 rounded border', speedStatus.color, 'border-current bg-current/10')}>
            {speedStatus.text}
          </div>
        </div>

        {/* Density */}
        <div className={'p-3 card-inner rounded flex items-center justify-between'}>
          <div>
            <div className={cn('text-xs font-mono uppercase mb-1', themeClasses.text)}>
              DENSITY
            </div>
            <div className="flex items-baseline gap-2">
              <span className={cn('text-2xl font-bold font-mono', densityStatus.color)}>
                {density === null ? '--' : density.toFixed(1)}
              </span>
              <span className={cn('text-xs font-mono', themeClasses.text)}>p/cm³</span>
            </div>
          </div>
          <div className={cn('text-xs font-mono px-2 py-1 rounded border', densityStatus.color, 'border-current bg-current/10')}>
            {densityStatus.text}
          </div>
        </div>

        {/* Bz (most important for geomagnetic activity) */}
        <div className={cn(
          'p-3 card-inner rounded flex items-center justify-between',
          bzStatus.isWarning && 'ring-2 ring-yellow-500/50 bg-yellow-500/10'
        )}>
          <div>
            <div className={cn('text-xs font-mono uppercase mb-1 flex items-center gap-1', themeClasses.text)}>
              Bz (IMF)
              {bzStatus.isWarning && <AlertTriangle className="w-3 h-3 text-[var(--sw-warning)]" />}
            </div>
            <div className="flex items-baseline gap-2">
              <span className={cn('text-2xl font-bold font-mono', bzStatus.color)}>
                {bz == null ? '--' : `${bz > 0 ? '+' : ''}${bz.toFixed(1)}`}
              </span>
              <span className={cn('text-xs font-mono', themeClasses.text)}>nT</span>
            </div>
          </div>
          <div className={cn('text-xs font-mono px-2 py-1 rounded border', bzStatus.color, 'border-current bg-current/10')}>
            {bzStatus.text}
          </div>
        </div>

        {/* Bt (Total Field) */}
        <div className={'p-3 card-inner rounded'}>
          <div className="flex items-center justify-between">
            <div className={cn('text-xs font-mono uppercase', themeClasses.text)}>
              Bt (Total Field)
            </div>
            <div className="flex items-baseline gap-2">
              <span className={cn('text-lg font-bold font-mono', themeClasses.accentText)}>
                {bt == null ? '--' : bt.toFixed(1)}
              </span>
              <span className={cn('text-xs font-mono', themeClasses.text)}>nT</span>
            </div>
          </div>
        </div>

        {/* Explanation */}
        <div className={cn('text-xs font-mono pt-2 border-t border-gray-700', themeClasses.text, 'opacity-70')}>
          <strong>Bz South</strong> (negative) = energy transfer into magnetosphere = aurora activity
        </div>
      </CardContent>
    </Card>
  );
}
