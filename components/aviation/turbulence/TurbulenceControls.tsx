/**
 * 16-Bit Weather Platform - Turbulence Map Controls
 *
 * Copyright (C) 2025 16-Bit Weather
 * Licensed under Fair Source License, Version 0.9
 */

'use client';

import React from 'react';
import { Clock, Mountain, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { themeTokens } from '@/lib/theme-tokens';

export type AltitudeFilter = 'all' | 'low' | 'mid' | 'high';

interface TurbulenceControlsProps {
  hoursBack: number;
  altitudeFilter: AltitudeFilter;
  pirepCount: number;
  isLoading: boolean;
  onHoursChange: (hours: number) => void;
  onAltitudeChange: (filter: AltitudeFilter) => void;
  onRefresh: () => void;
}

const HOUR_OPTIONS = [
  { value: 1, label: '1 Hour' },
  { value: 2, label: '2 Hours' },
  { value: 4, label: '4 Hours' },
  { value: 6, label: '6 Hours' },
];

const ALTITUDE_OPTIONS: Array<{ value: AltitudeFilter; label: string }> = [
  { value: 'all', label: 'All Altitudes' },
  { value: 'low', label: 'Below FL180' },
  { value: 'mid', label: 'FL180-FL350' },
  { value: 'high', label: 'Above FL350' },
];

export default function TurbulenceControls({
  hoursBack,
  altitudeFilter,
  pirepCount,
  isLoading,
  onHoursChange,
  onAltitudeChange,
  onRefresh,
}: TurbulenceControlsProps) {
  const themeClasses = themeTokens.weather;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2">
        <Clock className={cn('w-4 h-4', themeClasses.accentText)} aria-hidden="true" />
        <label
          htmlFor="hours-select"
          className={cn('text-xs font-mono uppercase', themeClasses.text)}
        >
          Age:
        </label>
        <select
          id="hours-select"
          value={hoursBack}
          onChange={(e) => onHoursChange(parseInt(e.target.value, 10))}
          className={cn(
            'px-2 py-1 text-xs font-mono border-2 rounded bg-card',
            themeClasses.borderColor,
            themeClasses.text,
          )}
        >
          {HOUR_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <Mountain className={cn('w-4 h-4', themeClasses.accentText)} aria-hidden="true" />
        <label
          htmlFor="altitude-filter"
          className={cn('text-xs font-mono uppercase', themeClasses.text)}
        >
          Altitude:
        </label>
        <select
          id="altitude-filter"
          value={altitudeFilter}
          onChange={(e) => onAltitudeChange(e.target.value as AltitudeFilter)}
          className={cn(
            'px-2 py-1 text-xs font-mono border-2 rounded bg-card',
            themeClasses.borderColor,
            themeClasses.text,
          )}
        >
          {ALTITUDE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <button
        onClick={onRefresh}
        disabled={isLoading}
        className={cn(
          'p-1.5 border-2 rounded hover:bg-muted transition-colors',
          themeClasses.borderColor,
          isLoading && 'opacity-50 cursor-not-allowed',
        )}
        aria-label="Refresh turbulence data"
      >
        <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} aria-hidden="true" />
      </button>

      <div className={cn('text-xs font-mono ml-auto', themeClasses.text)}>
        <span className={cn('font-bold', themeClasses.accentText)}>{pirepCount}</span> PIREPs
      </div>
    </div>
  );
}
