/**
 * 16-Bit Weather Platform - Sun Image Viewer Component
 *
 * Copyright (C) 2025 16-Bit Weather
 * Licensed under Fair Source License, Version 0.9
 *
 * Displays solar imagery with wavelength selector.
 * Images are fetched via /api/space-weather/sdo-image proxy which
 * sources from NOAA SWPC SUVI (primary) with NASA SDO fallback.
 */

'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Sun, RefreshCw, Maximize2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { themeTokens } from '@/lib/theme-tokens';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface Wavelength {
  id: string;
  name: string;
  description: string;
  color: string;
  /** Wavelength param for the SDO proxy API */
  wavelengthParam: string;
}

const WAVELENGTHS: Wavelength[] = [
  {
    id: '171',
    name: '171 Å',
    description: 'Corona (600,000K)',
    color: 'text-yellow-500',
    wavelengthParam: '0171',
  },
  {
    id: '195',
    name: '195 Å',
    description: 'Corona / Flare (1.2M K)',
    color: 'text-green-500',
    wavelengthParam: '0193',
  },
  {
    id: '304',
    name: '304 Å',
    description: 'Chromosphere (50,000K)',
    color: 'text-orange-500',
    wavelengthParam: '0304',
  },
  {
    id: '131',
    name: '131 Å',
    description: 'Flare (10 MK)',
    color: 'text-teal-400',
    wavelengthParam: '0131',
  },
  {
    id: '284',
    name: '284 Å',
    description: 'Active Regions',
    color: 'text-blue-500',
    wavelengthParam: '0284',
  },
  {
    id: '094',
    name: '094 Å',
    description: 'Hot Corona (6 MK)',
    color: 'text-emerald-400',
    wavelengthParam: '0094',
  },
  {
    id: 'HMI',
    name: 'HMI',
    description: 'Sunspots (Visible)',
    color: 'text-gray-300',
    wavelengthParam: 'HMIIF',
  },
  {
    id: 'LASCOC2',
    name: 'LASCO C2',
    description: 'Inner Corona (1.5-6 R☉)',
    color: 'text-red-400',
    wavelengthParam: 'LASCOC2',
  },
  {
    id: 'LASCOC3',
    name: 'LASCO C3',
    description: 'Outer Corona (3.5-30 R☉)',
    color: 'text-indigo-400',
    wavelengthParam: 'LASCOC3',
  },
];

const MAX_RETRIES = 2;

function buildProxyUrl(wavelengthParam: string, cacheBust: number): string {
  return `/api/space-weather/sdo-image?wavelength=${wavelengthParam}&t=${cacheBust}`;
}

interface SunImageViewerProps {
  className?: string;
}

export default function SunImageViewer({ className }: SunImageViewerProps) {
  const themeClasses = themeTokens.weather;
  const [selectedWavelength, setSelectedWavelength] = useState<Wavelength>(WAVELENGTHS[0]);
  const [isLoading, setIsLoading] = useState(true);
  // Initialize to null to avoid hydration mismatch
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [imageError, setImageError] = useState(false);
  const [showFullsize, setShowFullsize] = useState(false);
  const retryCountRef = useRef(0);

  // Set initial time on client mount and auto-refresh every 5 minutes
  useEffect(() => {
    setLastUpdate(new Date());
    const interval = setInterval(() => {
      setLastUpdate(new Date());
      setIsLoading(true);
      retryCountRef.current = 0;
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  const handleImageLoad = useCallback(() => {
    setIsLoading(false);
    setImageError(false);
    retryCountRef.current = 0;
  }, []);

  const handleImageError = useCallback(() => {
    if (retryCountRef.current < MAX_RETRIES) {
      retryCountRef.current += 1;
      // Retry after a short delay
      setTimeout(() => {
        setLastUpdate(new Date());
      }, 1500 * retryCountRef.current);
    } else {
      setIsLoading(false);
      setImageError(true);
    }
  }, []);

  const handleRefresh = () => {
    setLastUpdate(new Date());
    setIsLoading(true);
    setImageError(false);
    retryCountRef.current = 0;
  };

  // Add cache buster to URL (use 0 if not yet mounted to avoid hydration mismatch)
  const cacheTime = lastUpdate?.getTime() ?? 0;
  const imageUrl = buildProxyUrl(selectedWavelength.wavelengthParam, cacheTime);

  return (
    <>
      <Card className={cn('container-primary', themeClasses.background, className)}>
        <CardHeader className="border-b border-subtle py-3">
          <div className="flex items-center justify-between">
            <CardTitle className={cn('text-lg font-mono font-bold flex items-center gap-2', themeClasses.headerText)}>
              <Sun className="w-5 h-5 text-orange-500" />
              SUN VIEWER
              <span className="text-xs px-2 py-0.5 bg-cyan-500/20 text-cyan-500 rounded">
                SUVI/SDO
              </span>
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                disabled={isLoading}
                className="font-mono text-xs"
              >
                <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFullsize(true)}
                className="font-mono text-xs"
              >
                <Maximize2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          {/* Sun Image */}
          <div className="relative aspect-square bg-black rounded-lg overflow-hidden">
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                <div className={cn('text-sm font-mono', themeClasses.text, 'animate-pulse')}>
                  ACQUIRING SOLAR DATA...
                </div>
              </div>
            )}
            {imageError && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                <div className="text-center">
                  <div className="text-red-500 font-mono text-sm">SIGNAL LOST</div>
                  <div className={cn('text-xs font-mono mt-1', themeClasses.text, 'opacity-60')}>
                    NASA SDO servers unreachable
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRefresh}
                    className="mt-2 font-mono text-xs"
                  >
                    RETRY
                  </Button>
                </div>
              </div>
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt={`Sun in ${selectedWavelength.name}`}
              className={cn(
                'w-full h-full object-contain',
                isLoading && 'opacity-0',
                imageError && 'opacity-0'
              )}
              onLoad={handleImageLoad}
              onError={handleImageError}
            />

            {/* Wavelength info overlay */}
            <div className="absolute bottom-2 left-2 right-2 flex justify-between items-end">
              <div className={cn('text-xs font-mono px-2 py-1 bg-black/70 rounded', selectedWavelength.color)}>
                {selectedWavelength.name}
              </div>
              <div className={cn('text-xs font-mono px-2 py-1 bg-black/70 rounded', themeClasses.text)}>
                {selectedWavelength.description}
              </div>
            </div>
          </div>

          {/* Wavelength Selector */}
          <div className="grid grid-cols-4 gap-2">
            {WAVELENGTHS.map((wavelength) => (
              <button
                key={wavelength.id}
                onClick={() => {
                  setSelectedWavelength(wavelength);
                  setIsLoading(true);
                  setImageError(false);
                  retryCountRef.current = 0;
                }}
                className={cn(
                  'p-2 card-inner font-mono text-xs transition-all duration-200 rounded',
                  selectedWavelength.id === wavelength.id
                    ? cn('ring-2 ring-current', 'bg-gray-800')
                    : 'hover:bg-gray-800',
                  wavelength.color
                )}
                data-testid={`wavelength-${wavelength.id}`}
              >
                {wavelength.id}
              </button>
            ))}
          </div>

          {/* Last Update */}
          <div className={cn('text-xs font-mono text-center', themeClasses.text, 'opacity-70')}>
            Last update: {lastUpdate ? lastUpdate.toISOString().slice(11, 19) + 'Z' : '--:--:--'}
          </div>
        </CardContent>
      </Card>

      {/* Fullsize Modal */}
      {showFullsize && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setShowFullsize(false)}
        >
          <div className="relative max-w-4xl max-h-full">
            <button
              onClick={() => setShowFullsize(false)}
              className="absolute top-2 right-2 z-10 p-2 bg-black/50 rounded text-white hover:bg-black/70"
            >
              Close
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt={`Sun in ${selectedWavelength.name} (full resolution)`}
              className="max-w-full max-h-[90vh] object-contain"
            />
            <div className={cn('text-center mt-2 font-mono text-sm', selectedWavelength.color)}>
              {selectedWavelength.name} - {selectedWavelength.description}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
