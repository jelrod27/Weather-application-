/**
 * 16-Bit Weather Platform - Sunspot Display Component
 *
 * Copyright (C) 2025 16-Bit Weather
 * Licensed under Fair Source License, Version 0.9
 *
 * Displays current sunspot count and solar cycle position
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Sun, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { themeTokens } from '@/lib/theme-tokens';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export interface SunspotData {
  current: {
    sunspotNumber: number;
    observedF107: number;
    date: string;
  };
  solarCycle: {
    cycleNumber: number;
    phase: 'rising' | 'maximum' | 'declining' | 'minimum';
    percentComplete: number;
  };
  monthlySmoothed: number;
  trend: 'increasing' | 'decreasing' | 'stable';
}

interface SunspotDisplayProps {
  data: SunspotData | null;
  isLoading?: boolean;
}

// Get phase color - using semantic terminal colors
function getPhaseColor(phase: SunspotData['solarCycle']['phase']): string {
  switch (phase) {
    case 'minimum': return 'text-terminal-accent-info';
    case 'rising': return 'text-terminal-accent-success';
    case 'maximum': return 'text-terminal-accent-warning';
    case 'declining': return 'text-terminal-accent-warning';
    default: return 'text-terminal-text-muted';
  }
}

// Get sunspot activity level - using semantic terminal colors
function getActivityLevel(count: number): { text: string; color: string } {
  if (count < 30) return { text: 'QUIET', color: 'text-terminal-accent-info' };
  if (count < 80) return { text: 'LOW', color: 'text-terminal-accent-success' };
  if (count < 130) return { text: 'MODERATE', color: 'text-terminal-accent-warning' };
  if (count < 180) return { text: 'HIGH', color: 'text-orange-500' };
  return { text: 'VERY HIGH', color: 'text-terminal-accent-danger' };
}

// Trend icon
function TrendIcon({ trend }: { trend: SunspotData['trend'] }) {
  switch (trend) {
    case 'increasing':
      return <TrendingUp className="w-4 h-4 text-green-500" />;
    case 'decreasing':
      return <TrendingDown className="w-4 h-4 text-red-500" />;
    default:
      return <Minus className="w-4 h-4 text-gray-500" />;
  }
}

export default function SunspotDisplay({ data, isLoading = false }: SunspotDisplayProps) {
  const themeClasses = themeTokens.weather;
  // Delay transition so the progress bar renders at full width on mount.
  // Without this, the bar animates from 0 when the collapsible section first
  // expands because the grid cell has 0 width during initial layout.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    requestAnimationFrame(() => setMounted(true));
  }, []);

  if (isLoading) {
    return (
      <Card className={cn('container-primary', themeClasses.background)}>
        <CardHeader className={'border-b border-subtle py-3'}>
          <CardTitle className={cn('text-lg font-mono font-bold', themeClasses.headerText)}>
            SUNSPOTS
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="animate-pulse space-y-3">
            <div className="h-16 bg-gray-700 rounded" />
            <div className="h-4 bg-gray-700 rounded w-3/4" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const sunspotCount = data?.current?.sunspotNumber ?? 0;
  const activity = getActivityLevel(sunspotCount);
  const cyclePhase = data?.solarCycle?.phase ?? 'rising';
  const phaseColor = getPhaseColor(cyclePhase);

  return (
    <Card className={cn('container-primary', themeClasses.background)}>
      <CardHeader className={'border-b border-subtle py-3'}>
        <CardTitle className={cn('text-lg font-mono font-bold flex items-center gap-2', themeClasses.headerText)}>
          <Sun className="w-5 h-5 text-yellow-500" />
          SUNSPOTS
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        {/* Main Sunspot Count */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className={cn(
              'w-20 h-20 flex items-center justify-center text-3xl font-bold font-mono rounded-full border-4',
              'bg-yellow-500/20 border-yellow-500 text-yellow-500'
            )}>
              {sunspotCount}
            </div>
            {/* Animated spots */}
            {sunspotCount > 50 && (
              <>
                <div className="absolute top-2 right-2 w-2 h-2 bg-gray-800 rounded-full opacity-70" />
                <div className="absolute bottom-4 left-3 w-3 h-3 bg-gray-800 rounded-full opacity-60" />
              </>
            )}
            {sunspotCount > 100 && (
              <>
                <div className="absolute top-5 left-1 w-2 h-2 bg-gray-800 rounded-full opacity-50" />
                <div className="absolute bottom-2 right-4 w-2 h-2 bg-gray-800 rounded-full opacity-40" />
              </>
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className={cn('text-sm font-mono font-bold', activity.color)}>
                {activity.text}
              </span>
              {data?.trend && <TrendIcon trend={data.trend} />}
            </div>
            <div className={cn('text-xs font-mono', themeClasses.text)}>
              Daily Sunspot Number
            </div>
          </div>
        </div>

        {/* Solar Cycle Progress */}
        <div className={'p-3 card-inner rounded'}>
          <div className="flex items-center justify-between mb-2">
            <span className={cn('text-xs font-mono uppercase font-bold', themeClasses.headerText)}>
              SOLAR CYCLE {data?.solarCycle?.cycleNumber || 25}
            </span>
            <span className={cn('text-xs font-mono uppercase', phaseColor)}>
              {cyclePhase.toUpperCase()}
            </span>
          </div>

          {/* Progress bar */}
          <div className="space-y-1">
            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full',
                  mounted ? 'transition-all duration-1000' : '',
                  cyclePhase === 'minimum' ? 'bg-terminal-accent-info' :
                  cyclePhase === 'rising' ? 'bg-terminal-accent-success' :
                  cyclePhase === 'maximum' ? 'bg-orange-500' : 'bg-terminal-accent-warning'
                )}
                style={{ width: mounted ? `${data?.solarCycle?.percentComplete || 0}%` : '0%' }}
              />
            </div>
            <div className="flex justify-between text-xs font-mono">
              <span className={themeClasses.text}>Min</span>
              <span className={cn('font-bold', themeClasses.accentText)}>
                {data?.solarCycle?.percentComplete || 0}%
              </span>
              <span className={themeClasses.text}>Max</span>
            </div>
          </div>
        </div>

        {/* F10.7 Solar Radio Flux */}
        {data?.current?.observedF107 && data.current.observedF107 > 0 && (
          <div className={'p-3 card-inner rounded'}>
            <div className="flex items-center justify-between">
              <div className={cn('text-xs font-mono uppercase', themeClasses.text)}>
                F10.7 Radio Flux
              </div>
              <div className="flex items-baseline gap-2">
                <span className={cn('text-lg font-bold font-mono', themeClasses.accentText)}>
                  {data.current.observedF107}
                </span>
                <span className={cn('text-xs font-mono', themeClasses.text)}>SFU</span>
              </div>
            </div>
          </div>
        )}

        {/* Monthly Smoothed */}
        {data?.monthlySmoothed && data.monthlySmoothed > 0 && (
          <div className={'p-3 card-inner rounded'}>
            <div className="flex items-center justify-between">
              <div className={cn('text-xs font-mono uppercase', themeClasses.text)}>
                13-Month Smoothed
              </div>
              <span className={cn('text-lg font-bold font-mono', themeClasses.accentText)}>
                {data.monthlySmoothed}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
