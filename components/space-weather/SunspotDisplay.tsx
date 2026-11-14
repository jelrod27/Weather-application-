/**
 * 16-Bit Weather Platform - Sunspot Display Component
 *
 * Copyright (C) 2025 16-Bit Weather
 * Licensed under Fair Source License, Version 0.9
 *
 * Displays current sunspot count and solar cycle position
 */

'use client';

import React from 'react';
import { Sun } from 'lucide-react';
import { cn } from '@/lib/utils';
import { themeTokens } from '@/lib/theme-tokens';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export interface SunspotData {
  current: { sunspotNumber: number; observedF107: number | null; date: string; period?: 'monthly' };
  monthlySmoothed: number | null;
  smoothedDate?: string | null;
}

interface SunspotDisplayProps {
  data: SunspotData | null;
  isLoading?: boolean;
}

// Get sunspot activity level - using semantic terminal colors
function getActivityLevel(count: number): { text: string; color: string } {
  if (count < 30) return { text: 'QUIET', color: 'text-[var(--sw-info)]' };
  if (count < 80) return { text: 'LOW', color: 'text-[var(--sw-success)]' };
  if (count < 130) return { text: 'MODERATE', color: 'text-[var(--sw-warning)]' };
  if (count < 180) return { text: 'HIGH', color: 'text-[var(--sw-orange)]' };
  return { text: 'VERY HIGH', color: 'text-[var(--sw-danger)]' };
}

export default function SunspotDisplay({ data, isLoading = false }: SunspotDisplayProps): React.ReactElement {
  const themeClasses = themeTokens.weather;
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

  const sunspotCount = data?.current?.sunspotNumber ?? null;
  const activity = sunspotCount === null ? { text: 'UNAVAILABLE', color: 'text-muted-foreground' } : getActivityLevel(sunspotCount);

  return (
    <Card className={cn('container-primary', themeClasses.background)}>
      <CardHeader className={'border-b border-subtle py-3'}>
        <CardTitle className={cn('text-lg font-mono font-bold flex items-center gap-2', themeClasses.headerText)}>
          <Sun className="w-5 h-5 text-[var(--sw-warning)]" />
          SUNSPOTS
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        {/* Main Sunspot Count */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className={cn(
              'w-20 h-20 flex items-center justify-center text-3xl font-bold font-mono rounded-full border-4',
              'bg-yellow-500/20 border-yellow-500 text-[var(--sw-warning)]'
            )}>
              {sunspotCount ?? '--'}
            </div>
            {/* Animated spots */}
            {sunspotCount !== null && sunspotCount > 50 && (
              <>
                <div className="absolute top-2 right-2 w-2 h-2 bg-gray-800 rounded-full opacity-70" />
                <div className="absolute bottom-4 left-3 w-3 h-3 bg-gray-800 rounded-full opacity-60" />
              </>
            )}
            {sunspotCount !== null && sunspotCount > 100 && (
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
            </div>
            <div className={cn('text-xs font-mono', themeClasses.text)}>
              Monthly Sunspot Number
            </div>
          </div>
        </div>

        {data?.current.date && <p className="text-xs font-mono">Observation month: {data.current.date}</p>}

        {/* F10.7 Solar Radio Flux */}
        {data?.current?.observedF107 != null && (
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
        {data?.monthlySmoothed != null && (
          <div className={'p-3 card-inner rounded'}>
            <div className="flex items-center justify-between">
              <div className={cn('text-xs font-mono uppercase', themeClasses.text)}>
                NOAA 13-Month Smoothed {data?.smoothedDate ? `(${data.smoothedDate})` : ''}
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
