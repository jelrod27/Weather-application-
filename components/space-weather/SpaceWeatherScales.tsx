/**
 * 16-Bit Weather Platform - Space Weather Scales Component
 *
 * Copyright (C) 2025 16-Bit Weather
 * Licensed under Fair Source License, Version 0.9
 *
 * Displays NOAA R/S/G space weather scales with severity indicators
 */

'use client';

import React from 'react';
import { Radio, Zap, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { themeTokens } from '@/lib/theme-tokens';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export interface SpaceWeatherScalesData {
  R: { scale: number; text: string; description: string };
  S: { scale: number; text: string; description: string };
  G: { scale: number; text: string; description: string };
}

interface SpaceWeatherScalesProps {
  scales: SpaceWeatherScalesData | null;
  isLoading?: boolean;
}

// Get color based on scale level
function getScaleColor(scale: number): string {
  if (scale === 0) return 'text-green-500 bg-green-500/20 border-green-500';
  if (scale === 1) return 'text-yellow-400 bg-yellow-500/20 border-yellow-500';
  if (scale === 2) return 'text-yellow-500 bg-yellow-500/20 border-yellow-500';
  if (scale === 3) return 'text-orange-500 bg-orange-500/20 border-orange-500';
  if (scale === 4) return 'text-red-500 bg-red-500/20 border-red-500';
  return 'text-purple-500 bg-purple-500/20 border-purple-500'; // 5 = Extreme
}

// Get label for scale
function getScaleLabel(scale: number): string {
  if (scale === 0) return 'NONE';
  if (scale === 1) return 'MINOR';
  if (scale === 2) return 'MODERATE';
  if (scale === 3) return 'STRONG';
  if (scale === 4) return 'SEVERE';
  return 'EXTREME';
}

export default function SpaceWeatherScales({ scales, isLoading = false }: SpaceWeatherScalesProps) {
  const themeClasses = themeTokens.weather;

  if (isLoading) {
    return (
      <Card className={cn('container-primary', themeClasses.background)}>
        <CardHeader className="border-b border-subtle py-3">
          <CardTitle className={cn('text-lg font-mono font-bold', themeClasses.headerText)}>
            SPACE WEATHER SCALES
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-4 card-inner animate-pulse">
                <div className="h-8 bg-gray-700 rounded mb-2" />
                <div className="h-4 bg-gray-700 rounded w-1/2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const scaleItems = [
    {
      key: 'R',
      label: 'RADIO BLACKOUTS',
      icon: Radio,
      data: scales?.R,
    },
    {
      key: 'S',
      label: 'SOLAR RADIATION',
      icon: Zap,
      data: scales?.S,
    },
    {
      key: 'G',
      label: 'GEOMAGNETIC STORMS',
      icon: Globe,
      data: scales?.G,
    },
  ];

  return (
    <Card className={cn('container-primary', themeClasses.background)}>
      <CardHeader className="border-b border-subtle py-3">
        <CardTitle className={cn('text-lg font-mono font-bold flex items-center gap-2', themeClasses.headerText)}>
          SPACE WEATHER SCALES
          <span className={cn('text-xs px-2 py-0.5 bg-green-500/20 text-green-500 rounded',
            scales ? 'opacity-100' : 'opacity-50')}>
            {scales ? 'LIVE' : 'OFFLINE'}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {scaleItems.map(({ key, label, icon: Icon, data }) => {
            const scale = data?.scale ?? 0;
            const colorClass = getScaleColor(scale);
            const scaleLabel = getScaleLabel(scale);

            return (
              <div
                key={key}
                className={cn(
                  'p-4 card-inner transition-all duration-300',
                  scale > 2 && 'animate-pulse'
                )}
              >
                {/* Scale Letter and Value */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Icon className={cn('w-4 h-4', colorClass.split(' ')[0])} />
                    <span className={cn('text-xs font-mono uppercase', themeClasses.text)}>
                      {key}
                    </span>
                  </div>
                  <div className={cn(
                    'w-12 h-12 flex items-center justify-center text-2xl font-bold font-mono border-2 rounded',
                    colorClass
                  )}>
                    {scale}
                  </div>
                </div>

                {/* Scale Label */}
                <div className={cn('text-xs font-mono font-bold mb-1', colorClass.split(' ')[0])}>
                  {scaleLabel}
                </div>

                {/* Description */}
                <div className={cn('text-xs font-mono', themeClasses.text)}>
                  {label}
                </div>

                {/* Full description on hover/focus */}
                {data?.description && (
                  <div className={cn('text-xs font-mono mt-2 pt-2 border-t border-gray-700', themeClasses.text, 'opacity-70')}>
                    {data.description}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Scale Legend */}
        <div className={cn('mt-4 pt-4 border-t border-gray-700 text-xs font-mono', themeClasses.text)}>
          <div className="flex flex-wrap gap-4 justify-center">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 bg-green-500 rounded" /> 0: None
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 bg-yellow-400 rounded" /> 1: Minor
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 bg-yellow-500 rounded" /> 2: Moderate
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 bg-orange-500 rounded" /> 3: Strong
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 bg-red-500 rounded" /> 4: Severe
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 bg-purple-500 rounded" /> 5: Extreme
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
