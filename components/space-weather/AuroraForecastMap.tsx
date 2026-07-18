/**
 * 16-Bit Weather Platform - Aurora Forecast Map Component
 *
 * Copyright (C) 2025 16-Bit Weather
 * Licensed under Fair Source License, Version 0.9
 *
 * Displays NOAA aurora forecast visualization with viewline overlay
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, RefreshCw, MapPin, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/components/theme-provider';
import { getComponentStyles, type ThemeType } from '@/lib/theme-utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export interface AuroraForecastData {
  currentKp: number | null;
  viewline: {
    latitude: number;
    description: string;
  };
  hemisphere: 'north' | 'south';
  updatedAt: string;
}

interface AuroraForecastMapProps {
  data: AuroraForecastData | null;
  isLoading?: boolean;
}

// NOAA SWPC aurora forecast image URLs
const AURORA_IMAGES = {
  north: 'https://services.swpc.noaa.gov/images/aurora-forecast-northern-hemisphere.jpg',
  south: 'https://services.swpc.noaa.gov/images/aurora-forecast-southern-hemisphere.jpg',
};

// Get viewline description based on Kp
function getViewlineDescription(kp: number): string {
  if (kp < 2) return 'Far northern latitudes only (Alaska, northern Canada, Scandinavia)';
  if (kp < 3) return 'Northern Alaska, northern Canada, Iceland, northern Scandinavia';
  if (kp < 4) return 'Southern Alaska, central Canada, northern UK, central Scandinavia';
  if (kp < 5) return 'Northern US border states, southern UK, northern Europe';
  if (kp < 6) return 'Northern US (WA, MT, MN, MI, NY), central UK, central Europe';
  if (kp < 7) return 'Oregon, Nebraska, Great Lakes region, southern UK';
  if (kp < 8) return 'Northern California, Colorado, Illinois, Virginia';
  if (kp < 9) return 'Central California, Texas, Georgia - rare event!';
  return 'Potentially visible across most of US/Europe - extremely rare!';
}

// Get viewline latitude based on Kp
function getViewlineLatitude(kp: number): number {
  if (kp < 2) return 66;
  if (kp < 3) return 64;
  if (kp < 4) return 58;
  if (kp < 5) return 55;
  if (kp < 6) return 50;
  if (kp < 7) return 48;
  if (kp < 8) return 45;
  if (kp < 9) return 42;
  return 40;
}

// Get color based on Kp level
function getKpColor(kp: number): string {
  if (kp < 3) return 'text-green-500';
  if (kp < 5) return 'text-yellow-500';
  if (kp < 7) return 'text-orange-500';
  return 'text-red-500';
}

export default function AuroraForecastMap({ data, isLoading = false }: AuroraForecastMapProps) {
  const { theme } = useTheme()
  const themeClasses = getComponentStyles((theme || 'nord') as ThemeType, 'weather');
  const [hemisphere, setHemisphere] = useState<'north' | 'south'>('north');
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [mounted, setMounted] = useState(false);

  // Force reflow after dynamic import + conditional render in collapsible sections.
  // Without this, the aspect-square container can have 0 dimensions when first
  // mounted inside a grid cell, making the image invisible until window resize.
  useEffect(() => {
    requestAnimationFrame(() => setMounted(true));
  }, []);

  const currentKp = data?.currentKp;
  const currentKpDisplay = currentKp ?? null;
  const viewlineLatitude =
    data?.viewline?.latitude
    ?? (currentKp != null ? getViewlineLatitude(currentKp) : null);
  const viewlineDescription =
    data?.viewline?.description
    ?? (currentKp != null ? getViewlineDescription(currentKp) : 'Kp unavailable');

  // Reset image state when hemisphere changes
  useEffect(() => {
    setImageLoaded(false);
    setImageError(false);
  }, [hemisphere, refreshKey]);

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  if (isLoading) {
    return (
      <Card className={cn('container-primary', themeClasses.background)}>
        <CardHeader className={'border-b border-subtle py-3'}>
          <CardTitle className={cn('text-lg font-mono font-bold', themeClasses.headerText)}>
            AURORA FORECAST
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="animate-pulse space-y-4">
            <div className="aspect-square bg-gray-700 rounded" />
            <div className="h-4 bg-gray-700 rounded w-3/4" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('container-primary', themeClasses.background)} data-testid="aurora-forecast">
      <CardHeader className={'border-b border-subtle py-3'}>
        <div className="flex items-center justify-between">
          <CardTitle className={cn('text-lg font-mono font-bold flex items-center gap-2', themeClasses.headerText)}>
            <Sparkles className="w-5 h-5 text-green-400" />
            AURORA FORECAST
            <span className={cn(
              'text-xs px-2 py-0.5 border border-current bg-current/10',
              currentKpDisplay != null ? getKpColor(currentKpDisplay) : 'text-gray-400',
            )}>
              {currentKpDisplay != null ? `Kp ${currentKpDisplay}` : 'Kp --'}
            </span>
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            className="font-mono text-xs"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        {/* Hemisphere Selector */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setHemisphere('north')}
            className={cn(
              'p-2 card-inner font-mono text-xs transition-all duration-200 rounded',
              hemisphere === 'north'
                ? 'ring-2 ring-green-500/50 bg-green-500/20 text-green-500'
                : cn('hover:bg-gray-800', themeClasses.text)
            )}
          >
            <Globe className="w-4 h-4 mx-auto mb-1" />
            NORTHERN
          </button>
          <button
            onClick={() => setHemisphere('south')}
            className={cn(
              'p-2 card-inner font-mono text-xs transition-all duration-200 rounded',
              hemisphere === 'south'
                ? 'ring-2 ring-green-500/50 bg-green-500/20 text-green-500'
                : cn('hover:bg-gray-800', themeClasses.text)
            )}
          >
            <Globe className="w-4 h-4 mx-auto mb-1 rotate-180" />
            SOUTHERN
          </button>
        </div>

        {/* Aurora Forecast Image */}
        <div className="relative aspect-square bg-black rounded-lg overflow-hidden" style={{ minHeight: '200px' }}>
          {!imageLoaded && !imageError && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-10">
              <div className={cn('text-sm font-mono', themeClasses.text, 'animate-pulse')}>
                LOADING AURORA DATA...
              </div>
            </div>
          )}

          {imageError ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900">
              <Sparkles className="w-12 h-12 text-gray-600 mb-2" />
              <div className={cn('text-sm font-mono', themeClasses.text)}>
                Aurora image unavailable
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                className="mt-2 font-mono text-xs"
              >
                Retry
              </Button>
            </div>
          ) : mounted ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              key={`${hemisphere}-${refreshKey}`}
              src={`${AURORA_IMAGES[hemisphere]}?t=${refreshKey}`}
              alt={`Aurora forecast - ${hemisphere}ern hemisphere`}
              className={cn(
                'w-full h-full object-contain transition-opacity duration-300',
                imageLoaded ? 'opacity-100' : 'opacity-0'
              )}
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-10">
              <div className={cn('text-sm font-mono', themeClasses.text, 'animate-pulse')}>
                LOADING AURORA DATA...
              </div>
            </div>
          )}

          {/* Hemisphere label */}
          <div className="absolute top-2 left-2 text-xs font-mono px-2 py-1 bg-black/70 rounded text-white">
            {hemisphere === 'north' ? 'NORTH' : 'SOUTH'} POLE VIEW
          </div>
        </div>

        {/* Viewline Info */}
        <div className={'p-3 card-inner rounded'}>
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="w-4 h-4 text-green-400" />
            <span className={cn('text-xs font-mono font-bold uppercase', themeClasses.headerText)}>
              AURORA VIEWLINE
            </span>
          </div>
          <div className="flex items-center justify-between mb-2">
            <span className={cn('text-xs font-mono', themeClasses.text)}>
              Visible down to:
            </span>
            <span className={cn(
              'text-lg font-bold font-mono',
              currentKpDisplay != null ? getKpColor(currentKpDisplay) : 'text-gray-400',
            )}>
              {viewlineLatitude == null
                ? '--'
                : `${viewlineLatitude}°${hemisphere === 'north' ? 'N' : 'S'}`}
            </span>
          </div>
          <div className={cn('text-xs font-mono', themeClasses.text, 'opacity-80')}>
            {viewlineDescription}
          </div>
        </div>

        {/* Legend */}
        <div className={'p-3 card-inner rounded'}>
          <div className={cn('text-xs font-mono font-bold mb-2', themeClasses.headerText)}>
            AURORA INTENSITY
          </div>
          <div className="flex gap-1 h-3 rounded overflow-hidden mb-1">
            <div className="flex-1 bg-green-900" title="Low" />
            <div className="flex-1 bg-green-700" />
            <div className="flex-1 bg-green-500" />
            <div className="flex-1 bg-yellow-500" />
            <div className="flex-1 bg-orange-500" />
            <div className="flex-1 bg-red-500" title="High" />
          </div>
          <div className="flex justify-between text-xs font-mono">
            <span className={themeClasses.text}>Low</span>
            <span className={themeClasses.text}>High</span>
          </div>
        </div>

        {/* Info */}
        <div className={cn('text-xs font-mono text-center pt-2 border-t border-gray-700', themeClasses.text, 'opacity-70')}>
          NOAA SWPC 30-min aurora forecast. Best viewing: dark, clear skies.
        </div>
      </CardContent>
    </Card>
  );
}
