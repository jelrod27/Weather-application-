/**
 * 16-Bit Weather Platform - Kp Index Gauge Component
 *
 * Copyright (C) 2025 16-Bit Weather
 * Licensed under Fair Source License, Version 0.9
 *
 * Visual gauge for Planetary K-index (0-9 geomagnetic activity)
 */

'use client';

import React from 'react';
import { Activity, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { themeTokens } from '@/lib/theme-tokens';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export interface KpIndexData {
  current: {
    value: number;
    timeTag: string;
  };
  forecast: {
    expected: number;
    maxExpected: number;
  } | null;
}

interface KpIndexGaugeProps {
  data: KpIndexData | null;
  isLoading?: boolean;
}

// Get color based on Kp level
function getKpColor(kp: number): string {
  if (kp < 2) return 'bg-green-500';
  if (kp < 4) return 'bg-green-400';
  if (kp < 5) return 'bg-yellow-500';
  if (kp < 6) return 'bg-orange-500';
  if (kp < 7) return 'bg-red-500';
  if (kp < 8) return 'bg-red-600';
  return 'bg-purple-500';
}

// Get activity level text
function getActivityLevel(kp: number): { text: string; color: string } {
  if (kp < 2) return { text: 'QUIET', color: 'text-green-500' };
  if (kp < 4) return { text: 'UNSETTLED', color: 'text-green-400' };
  if (kp < 5) return { text: 'ACTIVE', color: 'text-yellow-500' };
  if (kp < 6) return { text: 'G1 MINOR STORM', color: 'text-orange-500' };
  if (kp < 7) return { text: 'G2 MODERATE STORM', color: 'text-orange-600' };
  if (kp < 8) return { text: 'G3 STRONG STORM', color: 'text-red-500' };
  if (kp < 9) return { text: 'G4 SEVERE STORM', color: 'text-red-600' };
  return { text: 'G5 EXTREME STORM', color: 'text-purple-500' };
}

// Get aurora visibility estimate
function getAuroraVisibility(kp: number): string {
  if (kp < 2) return 'Far north latitudes only (66°N+)';
  if (kp < 3) return 'Northern Scandinavia, central Alaska (64°N+)';
  if (kp < 4) return 'Southern Alaska, northern UK (58°N+)';
  if (kp < 5) return 'Northern US states, central UK (55°N+)';
  if (kp < 6) return 'Oregon, Wisconsin, southern UK (50°N+)';
  if (kp < 7) return 'Washington state, northern France (48°N+)';
  if (kp < 8) return 'Northern California, central France (45°N+)';
  if (kp < 9) return 'Central California, northern Spain (42°N+)';
  return 'Rare! Visible as far south as 40°N';
}

export default function KpIndexGauge({ data, isLoading = false }: KpIndexGaugeProps) {
  const themeClasses = themeTokens.weather;

  if (isLoading) {
    return (
      <Card className={cn('container-primary', themeClasses.background)}>
        <CardHeader className={'border-b border-subtle py-3'}>
          <CardTitle className={cn('text-lg font-mono font-bold', themeClasses.headerText)}>
            Kp INDEX
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="animate-pulse space-y-4">
            <div className="h-16 bg-gray-700 rounded" />
            <div className="h-4 bg-gray-700 rounded w-3/4" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const currentKp = data?.current?.value ?? 0;
  const activity = getActivityLevel(currentKp);
  const kpColor = getKpColor(currentKp);
  const auroraVisibility = getAuroraVisibility(currentKp);

  return (
    <Card className={cn('container-primary', themeClasses.background)}>
      <CardHeader className={'border-b border-subtle py-3'}>
        <CardTitle className={cn('text-lg font-mono font-bold flex items-center gap-2', themeClasses.headerText)}>
          <Activity className="w-5 h-5 text-yellow-500" />
          Kp INDEX
          <span className={cn('text-xs px-2 py-0.5 border', activity.color, 'border-current bg-current/10')}>
            {activity.text}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        {/* Main Kp Value */}
        <div className="flex items-center gap-4">
          <div className={cn(
            'w-20 h-20 flex items-center justify-center text-4xl font-bold font-mono rounded-lg border-4',
            kpColor,
            'text-white border-white/30'
          )}>
            {currentKp.toFixed(0)}
          </div>
          <div className="flex-1">
            <div className={cn('text-sm font-mono font-bold mb-1', activity.color)}>
              {activity.text}
            </div>
            <div className={cn('text-xs font-mono', themeClasses.text, 'opacity-80')}>
              Geomagnetic Activity
            </div>
          </div>
        </div>

        {/* Kp Bar Gauge */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs font-mono">
            <span className={themeClasses.text}>0</span>
            <span className={themeClasses.text}>9</span>
          </div>
          <div className="h-4 bg-gray-800 rounded-full overflow-hidden flex">
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((level) => (
              <div
                key={level}
                className={cn(
                  'flex-1 transition-all duration-500',
                  level <= Math.round(currentKp) ? getKpColor(level) : 'bg-gray-700',
                  level === Math.round(currentKp) && 'animate-pulse'
                )}
              />
            ))}
          </div>
          <div className="flex justify-between text-xs font-mono">
            <span className="text-green-500">Quiet</span>
            <span className="text-yellow-500">Active</span>
            <span className="text-red-500">Storm</span>
          </div>
        </div>

        {/* Aurora Visibility */}
        <div className={'p-3 card-inner rounded'}>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-4 h-4 text-green-400" />
            <span className={cn('text-xs font-mono font-bold', themeClasses.headerText)}>
              AURORA VIEWLINE
            </span>
          </div>
          <div className={cn('text-xs font-mono', themeClasses.text)}>
            {auroraVisibility}
          </div>
        </div>

        {/* Forecast */}
        {data?.forecast && (
          <div className={'p-3 card-inner rounded'}>
            <div className={cn('text-xs font-mono font-bold mb-1', themeClasses.headerText)}>
              24H FORECAST
            </div>
            <div className="flex justify-between items-center">
              <div className={cn('text-xs font-mono', themeClasses.text)}>
                Expected: <span className="font-bold">{data.forecast.expected.toFixed(1)}</span>
              </div>
              <div className={cn('text-xs font-mono', themeClasses.text)}>
                Max: <span className={cn('font-bold', getActivityLevel(data.forecast.maxExpected).color)}>
                  {data.forecast.maxExpected.toFixed(0)}
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
