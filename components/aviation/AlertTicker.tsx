/**
 * 16-Bit Weather Platform - Aviation Alert Ticker Component
 *
 * Copyright (C) 2025 16-Bit Weather
 * Licensed under Fair Source License, Version 0.9
 *
 * Scrolling display for SIGMET/AIRMET alerts in teletype format
 */

'use client';

import React, { useEffect, useRef, useState, type CSSProperties } from 'react';
import { AlertTriangle, Info, Plane } from 'lucide-react';
import { cn } from '@/lib/utils';
import { themeTokens } from '@/lib/theme-tokens';
import type { AviationAlert } from '@/lib/services/aviation-service';

export type { AviationAlert };

interface AlertTickerProps {
  alerts: AviationAlert[];
  isLoading?: boolean;
}

const severityVar: Record<AviationAlert['severity'], string> = {
  extreme: '--severity-extreme',
  severe: '--severity-severe',
  moderate: '--severity-moderate',
  low: '--severity-light',
};

function severityStyle(severity: AviationAlert['severity']): CSSProperties {
  const v = severityVar[severity] ?? severityVar.low;
  return {
    color: `var(${v})`,
    backgroundColor: `var(${v}-bg)`,
  };
}

export default function AlertTicker({ alerts, isLoading = false }: AlertTickerProps) {
  const themeClasses = themeTokens.weather;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [displayText, setDisplayText] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const advanceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getAlertIcon = (type: AviationAlert['type']) => {
    switch (type) {
      case 'SIGMET':
        return <AlertTriangle className="w-4 h-4" />;
      case 'PIREP':
        return <Plane className="w-4 h-4" />;
      default:
        return <Info className="w-4 h-4" />;
    }
  };

  // Typewriter effect for alerts
  useEffect(() => {
    if (alerts.length === 0 || isLoading) return;

    const currentAlert = alerts[currentIndex];
    const fullText = `[${currentAlert.type}] ${currentAlert.hazard.toUpperCase()} - ${currentAlert.region} - VALID ${currentAlert.validFrom} TO ${currentAlert.validTo}`;

    let charIndex = 0;
    setDisplayText('');
    setIsTyping(true);

    const typeInterval = setInterval(() => {
      if (charIndex < fullText.length) {
        // Type 2 characters at a time for faster display
        setDisplayText(fullText.slice(0, charIndex + 2));
        charIndex += 2;
      } else {
        setIsTyping(false);
        clearInterval(typeInterval);

        // Move to next alert after a pause
        advanceTimeoutRef.current = setTimeout(() => {
          setCurrentIndex((prev) => (prev + 1) % alerts.length);
        }, 4000);
      }
    }, 50);

    return () => {
      clearInterval(typeInterval);
      if (advanceTimeoutRef.current) {
        clearTimeout(advanceTimeoutRef.current);
        advanceTimeoutRef.current = null;
      }
    };
  }, [currentIndex, alerts, isLoading]);

  if (isLoading) {
    return (
      <div
        className={cn(
          'border-4 p-3 font-mono',
          themeClasses.borderColor,
          themeClasses.background
        )}
        role="status"
        aria-live="polite"
      >
        <div className="flex items-center gap-2">
          <div className="animate-pulse flex items-center gap-2">
            <AlertTriangle
              className="w-4 h-4"
              style={{ color: 'var(--severity-moderate)' }}
              aria-hidden="true"
            />
            <span className={cn('text-xs', themeClasses.text)}>LOADING AVIATION ALERTS...</span>
          </div>
          <span className="animate-pulse" style={{ color: 'var(--severity-moderate)' }} aria-hidden="true">_</span>
        </div>
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <div
        className={cn(
          'border-4 p-3 font-mono',
          themeClasses.borderColor,
          themeClasses.background
        )}
        role="status"
      >
        <div className="flex items-center gap-2">
          <Info
            className="w-4 h-4"
            style={{ color: 'var(--severity-light)' }}
            aria-hidden="true"
          />
          <span className="text-xs" style={{ color: 'var(--severity-light)' }}>
            NO ACTIVE AVIATION ALERTS - ALL CLEAR
          </span>
        </div>
      </div>
    );
  }

  const currentAlert = alerts[currentIndex];
  const severityStyles = severityStyle(currentAlert.severity);

  return (
    <div
      className={cn(
        'border-4 p-3 font-mono overflow-hidden',
        themeClasses.borderColor,
        themeClasses.background
      )}
      role="region"
      aria-label="Aviation alerts ticker"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'text-xs font-bold px-2 py-0.5 border-2 inline-flex items-center',
              themeClasses.borderColor
            )}
            style={severityStyles}
            aria-hidden="true"
          >
            {getAlertIcon(currentAlert.type)}
          </span>
          <span
            className="text-xs font-bold uppercase px-1"
            style={severityStyles}
          >
            {currentAlert.type}
          </span>
        </div>
        <span className={cn('text-xs', themeClasses.text)} aria-label={`Alert ${currentIndex + 1} of ${alerts.length}`}>
          {currentIndex + 1}/{alerts.length}
        </span>
      </div>

      {/* Ticker Display */}
      <div className="text-sm" style={severityStyles} aria-live="polite">
        {displayText}
        {isTyping && <span className="animate-pulse" aria-hidden="true">_</span>}
      </div>

      {/* Alert Counter */}
      <div className="flex gap-1 mt-2" aria-hidden="true">
        {alerts.map((_, idx) => (
          <div
            key={idx}
            className={cn(
              'h-1 flex-1 transition-all duration-300',
              idx === currentIndex
                ? themeClasses.accentBg
                : 'bg-muted'
            )}
          />
        ))}
      </div>
    </div>
  );
}
