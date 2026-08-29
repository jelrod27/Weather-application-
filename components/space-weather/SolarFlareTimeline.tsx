/**
 * 16-Bit Weather Platform - Solar Flare Timeline Component
 *
 * Copyright (C) 2025 16-Bit Weather
 * Licensed under Fair Source License, Version 0.9
 *
 * Scrollable timeline of recent solar flare events from NASA DONKI
 * Color-coded by flare classification (A/B/C/M/X)
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Zap, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { themeTokens } from '@/lib/theme-tokens';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface SolarFlareTimelineProps {
  className?: string;
}

interface FlareEvent {
  id: string;
  beginTime: string;
  peakTime: string;
  endTime: string;
  classification: string;
  classLetter: string;
  classNumber: number;
  sourceLocation: string;
  activeRegion: number | null;
  instruments: string[];
  linkedCME: boolean;
}

interface FlareSummary {
  total: number;
  byClass: { X: number; M: number; C: number; B: number };
  strongestFlare: string;
  withCME: number;
}

interface FlareApiResponse {
  events: FlareEvent[];
  summary: FlareSummary;
  updatedAt: string;
  error?: string;
}

// Color mapping by class letter
function getClassColors(classLetter: string): { text: string; bg: string; border: string } {
  switch (classLetter) {
    case 'X':
      return { text: 'text-red-500', bg: 'bg-red-500/20', border: 'border-red-500' };
    case 'M':
      return { text: 'text-orange-500', bg: 'bg-orange-500/20', border: 'border-orange-500' };
    case 'C':
      return { text: 'text-cyan-500', bg: 'bg-cyan-500/20', border: 'border-cyan-500' };
    case 'B':
    case 'A':
    default:
      return { text: 'text-gray-400', bg: 'bg-gray-500/20', border: 'border-gray-500' };
  }
}

// Format time in local timezone (e.g., "04:35 AM PDT")
function formatLocalTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZoneName: 'short',
  });
}

// Format date (e.g., "Mar 28")
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export default function SolarFlareTimeline({ className }: SolarFlareTimelineProps) {
  const themeClasses = themeTokens.weather;

  const [events, setEvents] = useState<FlareEvent[]>([]);
  const [summary, setSummary] = useState<FlareSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFlares = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/space-weather/flares');
      const data: FlareApiResponse = await response.json();

      if (data.error && data.events.length === 0) {
        setError(data.error);
      }

      setEvents(data.events || []);
      setSummary(data.summary || null);
    } catch (err) {
      console.error('[SolarFlareTimeline] Failed to fetch flare data:', err);
      setError('Failed to load solar flare data');
      setEvents([]);
      setSummary(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFlares();
  }, []);

  return (
    <Card className={cn('container-primary', themeClasses.background, className)} data-testid="flare-timeline">
      <CardHeader className="border-b border-subtle py-3">
        <div className="flex items-center justify-between">
          <CardTitle className={cn('text-lg font-mono font-bold flex items-center gap-2', themeClasses.headerText)}>
            <Zap className="w-5 h-5 text-yellow-500" />
            RECENT SOLAR FLARES
            {summary && summary.total > 0 && (
              <span className={cn('text-xs px-2 py-0.5 border', themeClasses.borderColor, themeClasses.accentBg)}>
                {summary.total} in 7 days
              </span>
            )}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchFlares}
            className="font-mono text-xs"
            title="Refresh"
          >
            <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-4">
        {/* Loading skeleton */}
        {isLoading && (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="animate-pulse flex items-center gap-3">
                <div className="w-14 h-7 bg-gray-700 rounded" />
                <div className="flex-1 h-4 bg-gray-700 rounded" />
              </div>
            ))}
          </div>
        )}

        {/* Error state */}
        {!isLoading && error && events.length === 0 && (
          <div className={cn('text-center font-mono text-sm py-6', themeClasses.text, 'opacity-70')}>
            {error}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !error && events.length === 0 && (
          <div className={cn('text-center font-mono text-sm py-6', themeClasses.text, 'opacity-70')}>
            No flare activity detected
          </div>
        )}

        {/* Flare list */}
        {!isLoading && events.length > 0 && (
          <div className="max-h-[400px] overflow-y-auto space-y-1 pr-1" data-testid="flare-list">
            {events.map((event) => {
              const colors = getClassColors(event.classLetter);

              return (
                <div
                  key={event.id}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded transition-colors',
                    'hover:bg-gray-800/50',
                    'font-mono text-xs'
                  )}
                >
                  {/* Class badge */}
                  <span
                    className={cn(
                      'inline-flex items-center justify-center min-w-[56px] px-2 py-1 rounded border font-bold text-sm',
                      colors.text,
                      colors.bg,
                      colors.border
                    )}
                  >
                    {event.classification}
                  </span>

                  {/* Time and date */}
                  <div className="flex-1 flex items-center justify-between gap-2">
                    <span className={cn(themeClasses.text)}>
                      {formatLocalTime(event.peakTime)}
                    </span>
                    <span className={cn(themeClasses.text, 'opacity-60')}>
                      {formatDate(event.peakTime)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Summary bar */}
        {!isLoading && summary && summary.total > 0 && (
          <div className={cn(
            'flex items-center justify-between mt-4 pt-3 border-t border-gray-700 font-mono text-xs',
            themeClasses.text,
            'opacity-70'
          )}>
            <div className="flex items-center gap-3">
              {summary.byClass.X > 0 && (
                <span className="text-red-500">X: {summary.byClass.X}</span>
              )}
              {summary.byClass.M > 0 && (
                <span className="text-orange-500">M: {summary.byClass.M}</span>
              )}
              {summary.byClass.C > 0 && (
                <span className="text-cyan-500">C: {summary.byClass.C}</span>
              )}
              {summary.byClass.B > 0 && (
                <span className="text-gray-400">B: {summary.byClass.B}</span>
              )}
            </div>
            <span>Strongest: {summary.strongestFlare}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
