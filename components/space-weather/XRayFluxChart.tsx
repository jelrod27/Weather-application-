/**
 * 16-Bit Weather Platform - X-Ray Flux Chart Component
 *
 * Copyright (C) 2025 16-Bit Weather
 * Licensed under Fair Source License, Version 0.9
 *
 * Displays GOES X-ray flux with solar flare classification
 */

'use client';

import React from 'react';
import { Zap, TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/components/theme-provider';
import { getComponentStyles, type ThemeType } from '@/lib/theme-utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export interface XRayFluxData {
  current: {
    shortWave?: number; // 0.05-0.4 nm (W/m²)
    longWave?: number; // 0.1-0.8 nm (W/m²)
    classification?: string; // A, B, C, M, X
    subClass?: number; // 1.0-9.9
    timestamp?: string;
    /** Fields from /api/space-weather/xray-flux */
    flux?: number;
    flareClass?: string;
    classNumber?: string;
  };
  peak24h?: {
    classification: string;
    subClass: number;
    timestamp: string;
  } | null;
  peakLast24h?: {
    flux: number;
    flareClass: string;
    timeTag: string;
  } | null;
  background?: string;
  trend?: 'increasing' | 'decreasing' | 'stable';
}

interface XRayFluxChartProps {
  data: XRayFluxData | null;
  isLoading?: boolean;
}

// Get classification color
function getClassificationColor(classification: string): string {
  switch (classification?.toUpperCase()) {
    case 'X': return 'text-red-500';
    case 'M': return 'text-orange-500';
    case 'C': return 'text-yellow-500';
    case 'B': return 'text-green-400';
    case 'A': return 'text-green-500';
    default: return 'text-gray-400';
  }
}

// Get classification background
function getClassificationBg(classification: string): string {
  switch (classification?.toUpperCase()) {
    case 'X': return 'bg-red-500';
    case 'M': return 'bg-orange-500';
    case 'C': return 'bg-yellow-500';
    case 'B': return 'bg-green-400';
    case 'A': return 'bg-green-500';
    default: return 'bg-gray-500';
  }
}

// Get classification description
function getClassificationDescription(classification: string): string {
  switch (classification?.toUpperCase()) {
    case 'X': return 'Major flare - Radio blackouts, radiation storms possible';
    case 'M': return 'Moderate flare - Brief radio blackouts at poles';
    case 'C': return 'Small flare - Minor impact on HF radio';
    case 'B': return 'Minor flare - No significant impact';
    case 'A': return 'Background level - No flare activity';
    default: return 'Unknown classification';
  }
}

// Get impact level
function getImpactLevel(classification: string): { text: string; color: string; severity: number } {
  switch (classification?.toUpperCase()) {
    case 'X': return { text: 'SEVERE', color: 'text-red-500', severity: 5 };
    case 'M': return { text: 'MODERATE', color: 'text-orange-500', severity: 4 };
    case 'C': return { text: 'MINOR', color: 'text-yellow-500', severity: 3 };
    case 'B': return { text: 'MINIMAL', color: 'text-green-400', severity: 2 };
    case 'A': return { text: 'NONE', color: 'text-green-500', severity: 1 };
    default: return { text: 'UNKNOWN', color: 'text-gray-400', severity: 0 };
  }
}

// Format scientific notation for display
function formatFlux(value: number): string {
  if (!value || value === 0) return '0';
  const exponent = Math.floor(Math.log10(Math.abs(value)));
  const mantissa = value / Math.pow(10, exponent);
  return `${mantissa.toFixed(1)}×10^${exponent}`;
}

// Trend icon
function TrendIcon({ trend }: { trend: XRayFluxData['trend'] }) {
  switch (trend) {
    case 'increasing':
      return <TrendingUp className="w-4 h-4 text-red-500" />;
    case 'decreasing':
      return <TrendingDown className="w-4 h-4 text-green-500" />;
    default:
      return <Minus className="w-4 h-4 text-gray-500" />;
  }
}

export default function XRayFluxChart({ data, isLoading = false }: XRayFluxChartProps) {
  const { theme } = useTheme();
  const themeClasses = getComponentStyles((theme || 'nord') as ThemeType, 'weather');

  if (isLoading) {
    return (
      <Card className={cn('container-primary', themeClasses.background)}>
        <CardHeader className={'border-b border-subtle py-3'}>
          <CardTitle className={cn('text-lg font-mono font-bold', themeClasses.headerText)}>
            X-RAY FLUX
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="animate-pulse space-y-4">
            <div className="h-20 bg-gray-700 rounded" />
            <div className="h-4 bg-gray-700 rounded w-3/4" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const classification = data?.current?.classification ?? 'A';
  const subClass = data?.current?.subClass ?? 0;
  const classColor = getClassificationColor(classification);
  const impact = getImpactLevel(classification);
  const description = getClassificationDescription(classification);

  return (
    <Card className={cn('container-primary', themeClasses.background)} data-testid="xray-flux">
      <CardHeader className={'border-b border-subtle py-3'}>
        <div className="flex items-center justify-between">
          <CardTitle className={cn('text-lg font-mono font-bold flex items-center gap-2', themeClasses.headerText)}>
            <Zap className="w-5 h-5 text-yellow-500" />
            X-RAY FLUX
            {impact.severity >= 4 && (
              <AlertTriangle className="w-4 h-4 text-orange-500 animate-pulse" />
            )}
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
      <CardContent className="p-4 space-y-4">
        {/* Main Classification Display */}
        <div className="flex items-center gap-4">
          <div className={cn(
            'w-24 h-24 flex flex-col items-center justify-center rounded-lg border-4',
            getClassificationBg(classification),
            'text-white border-white/30'
          )}>
            <span className="text-4xl font-bold font-mono">
              {classification}
            </span>
            <span className="text-lg font-mono">
              {subClass.toFixed(1)}
            </span>
          </div>
          <div className="flex-1">
            <div className={cn('text-sm font-mono font-bold mb-1', impact.color)}>
              {impact.text} IMPACT
            </div>
            <div className={cn('text-xs font-mono', themeClasses.text, 'opacity-90')}>
              {description}
            </div>
          </div>
        </div>

        {/* Classification Scale */}
        <div className="space-y-2">
          <div className={cn('text-xs font-mono font-bold', themeClasses.headerText)}>
            FLARE CLASSIFICATION SCALE
          </div>
          <div className="flex gap-1">
            {['A', 'B', 'C', 'M', 'X'].map((cls) => (
              <div
                key={cls}
                className={cn(
                  'flex-1 h-8 flex items-center justify-center font-mono font-bold text-sm transition-all duration-300',
                  getClassificationBg(cls),
                  classification === cls
                    ? 'text-white ring-2 ring-white ring-offset-2 ring-offset-gray-900'
                    : 'text-white/70 opacity-50'
                )}
              >
                {cls}
              </div>
            ))}
          </div>
          <div className="flex justify-between text-xs font-mono">
            <span className={themeClasses.text}>Background</span>
            <span className={themeClasses.text}>Major Flare</span>
          </div>
        </div>

        {/* Flux Values */}
        <div className="grid grid-cols-2 gap-2">
          <div className={'p-3 card-inner rounded'}>
            <div className={cn('text-xs font-mono uppercase mb-1', themeClasses.text)}>
              Long Wave (1-8Å)
            </div>
            <div className={cn('text-sm font-bold font-mono', themeClasses.accentText)}>
              {data?.current?.longWave ? formatFlux(data.current.longWave) : '—'} W/m²
            </div>
          </div>
          <div className={'p-3 card-inner rounded'}>
            <div className={cn('text-xs font-mono uppercase mb-1', themeClasses.text)}>
              Short Wave (0.5-4Å)
            </div>
            <div className={cn('text-sm font-bold font-mono', themeClasses.accentText)}>
              {data?.current?.shortWave ? formatFlux(data.current.shortWave) : '—'} W/m²
            </div>
          </div>
        </div>

        {/* 24h Peak */}
        {data?.peak24h && (
          <div className={'p-3 card-inner rounded'}>
            <div className="flex items-center justify-between">
              <div className={cn('text-xs font-mono uppercase', themeClasses.text)}>
                24h Peak Flare
              </div>
              <div className="flex items-center gap-2">
                <span className={cn(
                  'px-2 py-0.5 font-bold font-mono text-sm rounded',
                  getClassificationBg(data.peak24h.classification),
                  'text-white'
                )}>
                  {data.peak24h.classification}{data.peak24h.subClass.toFixed(1)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Background Level */}
        {data?.background && (
          <div className={'p-3 card-inner rounded'}>
            <div className="flex items-center justify-between">
              <div className={cn('text-xs font-mono uppercase', themeClasses.text)}>
                Background Level
              </div>
              <span className={cn('text-sm font-bold font-mono', getClassificationColor(data.background.charAt(0)))}>
                {data.background}
              </span>
            </div>
          </div>
        )}

        {/* Impact Info */}
        <div className={cn('text-xs font-mono pt-2 border-t border-gray-700 space-y-1', themeClasses.text, 'opacity-70')}>
          <div><strong>M-class:</strong> HF radio degradation on sunlit side</div>
          <div><strong>X-class:</strong> HF radio blackout, navigation errors</div>
        </div>
      </CardContent>
    </Card>
  );
}
