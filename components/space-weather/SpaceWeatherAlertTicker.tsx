/**
 * 16-Bit Weather Platform - Space Weather Alert Ticker Component
 *
 * Copyright (C) 2025 16-Bit Weather
 * Licensed under Fair Source License, Version 0.9
 *
 * Scrolling ticker for space weather alerts (similar to aviation AlertTicker)
 */

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { AlertTriangle, Info, Zap, Radio, Globe, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatTimeAgo } from '@/lib/format-time-ago';
import { useTheme } from '@/components/theme-provider';
import { getComponentStyles, type ThemeType } from '@/lib/theme-utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export interface SpaceWeatherAlert {
  id: string;
  type: 'watch' | 'warning' | 'alert' | 'summary' | 'message';
  severity: 'info' | 'minor' | 'moderate' | 'strong' | 'severe' | 'extreme';
  title: string;
  issuedAt: string;
  summary: string;
}

interface SpaceWeatherAlertTickerProps {
  alerts: SpaceWeatherAlert[];
  isLoading?: boolean;
}

// Get icon based on alert type
function getAlertIcon(type: SpaceWeatherAlert['type']) {
  switch (type) {
    case 'warning':
    case 'alert':
      return AlertTriangle;
    case 'watch':
      return Zap;
    case 'summary':
      return Globe;
    default:
      return Info;
  }
}

// Get color based on severity - using semantic terminal colors
function getSeverityColors(severity: SpaceWeatherAlert['severity']): string {
  switch (severity) {
    case 'extreme':
      return 'text-purple-500 bg-purple-500/10 border-purple-500';
    case 'severe':
      return 'text-terminal-accent-danger bg-terminal-accent-danger/10 border-terminal-accent-danger';
    case 'strong':
      return 'text-orange-500 bg-orange-500/10 border-orange-500';
    case 'moderate':
      return 'text-terminal-accent-warning bg-terminal-accent-warning/10 border-terminal-accent-warning';
    case 'minor':
      return 'text-terminal-accent-warning bg-terminal-accent-warning/10 border-terminal-accent-warning';
    default:
      return 'text-terminal-accent-info bg-terminal-accent-info/10 border-terminal-accent-info';
  }
}

export default function SpaceWeatherAlertTicker({ alerts, isLoading = false }: SpaceWeatherAlertTickerProps) {
  const { theme } = useTheme();
  const themeClasses = getComponentStyles((theme || 'nord') as ThemeType, 'weather');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoScrolling, setIsAutoScrolling] = useState(true);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize time on client mount and update every minute for "time ago" display
  useEffect(() => {
    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Reset currentIndex if it goes out of bounds when alerts array changes
  useEffect(() => {
    if (alerts.length > 0 && currentIndex >= alerts.length) {
      setCurrentIndex(0);
    }
  }, [alerts.length, currentIndex]);

  // Auto-scroll alerts
  useEffect(() => {
    if (isAutoScrolling && alerts.length > 1) {
      intervalRef.current = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % alerts.length);
      }, 5000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isAutoScrolling, alerts.length]);

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % alerts.length);
    setIsAutoScrolling(false);
    // Resume auto-scroll after 10 seconds
    setTimeout(() => setIsAutoScrolling(true), 10000);
  };

  const goToPrev = () => {
    setCurrentIndex((prev) => (prev - 1 + alerts.length) % alerts.length);
    setIsAutoScrolling(false);
    setTimeout(() => setIsAutoScrolling(true), 10000);
  };

  if (isLoading) {
    return (
      <Card className={cn('container-primary', themeClasses.background)}>
        <CardHeader className={'border-b border-subtle py-3'}>
          <CardTitle className={cn('text-lg font-mono font-bold flex items-center gap-2', themeClasses.headerText)}>
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
            SPACE WEATHER ALERTS
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="animate-pulse h-20 bg-gray-800 rounded" />
        </CardContent>
      </Card>
    );
  }

  if (alerts.length === 0) {
    return (
      <Card className={cn('container-primary', themeClasses.background)}>
        <CardHeader className={'border-b border-subtle py-3'}>
          <CardTitle className={cn('text-lg font-mono font-bold flex items-center gap-2', themeClasses.headerText)}>
            <Radio className="w-5 h-5 text-green-500" />
            SPACE WEATHER ALERTS
            <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-500 rounded">
              ALL QUIET
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className={cn('text-center font-mono text-sm', themeClasses.text)}>
            No active space weather alerts at this time.
          </div>
        </CardContent>
      </Card>
    );
  }

  const currentAlert = alerts[currentIndex];
  const Icon = getAlertIcon(currentAlert.type);
  const severityColors = getSeverityColors(currentAlert.severity);

  return (
    <Card className={cn('container-primary', themeClasses.background)} data-testid="alert-ticker">
      <CardHeader className={'border-b border-subtle py-3'}>
        <div className="flex items-center justify-between">
          <CardTitle className={cn('text-lg font-mono font-bold flex items-center gap-2', themeClasses.headerText)}>
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
            SPACE WEATHER ALERTS
            <span className={cn('text-xs px-2 py-0.5 border', severityColors)}>
              {alerts.length} ACTIVE
            </span>
          </CardTitle>
          {alerts.length > 1 && (
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={goToPrev}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className={cn('text-xs font-mono', themeClasses.text)}>
                {currentIndex + 1}/{alerts.length}
              </span>
              <Button variant="ghost" size="sm" onClick={goToNext}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div className={cn('p-4 border-2 transition-all duration-300', severityColors)}>
          {/* Alert Header */}
          <div className="flex items-start justify-between gap-4 mb-2">
            <div className="flex items-center gap-2">
              <Icon className={cn('w-5 h-5 shrink-0', severityColors.split(' ')[0])} />
              <div>
                <span className={cn('text-xs font-mono uppercase font-bold', severityColors.split(' ')[0])}>
                  {currentAlert.type}
                </span>
                <span className={cn('text-xs font-mono uppercase ml-2', themeClasses.text)}>
                  {currentAlert.severity}
                </span>
              </div>
            </div>
            <span className={cn('text-xs font-mono', themeClasses.text, 'opacity-70')}>
              {currentTime ? formatTimeAgo(currentAlert.issuedAt, { now: currentTime.getTime() }) : '--'}
            </span>
          </div>

          {/* Alert Title */}
          <div className={cn('font-mono text-sm font-bold mb-2', themeClasses.headerText)}>
            {currentAlert.title}
          </div>

          {/* Alert Summary */}
          <div className={cn('font-mono text-xs', themeClasses.text, 'opacity-90 line-clamp-3')}>
            {currentAlert.summary}
          </div>
        </div>

        {/* Progress indicators */}
        {alerts.length > 1 && (
          <div className="flex justify-center gap-1 mt-3">
            {alerts.map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  setCurrentIndex(index);
                  setIsAutoScrolling(false);
                  setTimeout(() => setIsAutoScrolling(true), 10000);
                }}
                className={cn(
                  'w-2 h-2 rounded-full transition-all duration-300',
                  index === currentIndex ? 'bg-yellow-500 w-4' : 'bg-gray-600 hover:bg-gray-500'
                )}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
