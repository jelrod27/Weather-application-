/**
 * 16-Bit Weather Platform - Compact Scales Component
 *
 * Copyright (C) 2025 16-Bit Weather
 * Licensed under Fair Source License, Version 0.9
 *
 * Compact horizontal bar showing R/S/G scales inline
 */

'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { themeTokens } from '@/lib/theme-tokens';
import type { SpaceWeatherScalesData } from './SpaceWeatherScales';

interface CompactScalesProps {
  data: SpaceWeatherScalesData | null;
}

function getScaleLabel(scale: number): string {
  if (scale === 0) return 'NONE';
  if (scale === 1) return 'MINOR';
  if (scale === 2) return 'MODERATE';
  if (scale === 3) return 'STRONG';
  if (scale === 4) return 'SEVERE';
  return 'EXTREME';
}

function getScaleColor(scale: number): string {
  if (scale === 0) return 'text-green-500';
  if (scale <= 2) return 'text-yellow-500';
  if (scale === 3) return 'text-orange-500';
  return 'text-red-500';
}

const scaleKeys = ['R', 'S', 'G'] as const;

export default function CompactScales({ data }: CompactScalesProps) {
  const themeClasses = themeTokens.weather;

  if (!data) return null;

  return (
    <div className={cn(
      'flex items-center gap-3 font-mono text-xs px-3 py-2 container-primary',
      themeClasses.background
    )}>
      {scaleKeys.map((key, idx) => {
        const scale = data[key].scale;
        const color = getScaleColor(scale);

        return (
          <React.Fragment key={key}>
            {idx > 0 && (
              <span className={cn('opacity-40', themeClasses.text)}>|</span>
            )}
            <span
              data-scale={key}
              className={cn('flex items-center gap-1', color)}
            >
              <span className={cn('font-bold', themeClasses.text)}>{key}:</span>
              <span className="font-bold">{scale}</span>
              <span>{getScaleLabel(scale)}</span>
            </span>
          </React.Fragment>
        );
      })}
    </div>
  );
}
