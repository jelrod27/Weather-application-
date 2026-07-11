/**
 * 16-Bit Weather Platform - Space Weather Page
 *
 * Copyright (C) 2025 16-Bit Weather
 * Licensed under Fair Source License, Version 0.9
 *
 * Real-time space weather monitoring with solar data visualization
 */

'use client';

import React, { useEffect, useState, Suspense, lazy, useCallback, startTransition } from 'react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/components/theme-provider';
import { getComponentStyles, type ThemeType } from '@/lib/theme-utils';
import PageWrapper from '@/components/page-wrapper';
import type { SpaceWeatherAlert } from '@/components/space-weather/SpaceWeatherAlertTicker';
import type { KpIndexData } from '@/components/space-weather/KpIndexGauge';
import type { SolarWindData } from '@/components/space-weather/SolarWindStats';
import type { SunspotData } from '@/components/space-weather/SunspotDisplay';
import type { XRayFluxData } from '@/components/space-weather/XRayFluxChart';
import type { AuroraForecastData } from '@/components/space-weather/AuroraForecastMap';
import type { SpaceWeatherScalesData } from '@/components/space-weather/SpaceWeatherScales';
import { ShareButtons } from '@/components/share-buttons';

// Lazy load the heavy terminal component
const SolarCommandTerminal = lazy(() => import('@/components/space-weather/SolarCommandTerminal'));

interface SpaceWeatherData {
  scales: SpaceWeatherScalesData | null;
  alerts: SpaceWeatherAlert[];
  kpIndex: KpIndexData | null;
  solarWind: SolarWindData | null;
  sunspots: SunspotData | null;
  xrayFlux: XRayFluxData | null;
  auroraForecast: AuroraForecastData | null;
}

export default function SpaceWeatherClient() {
  const { theme } = useTheme();
  const themeClasses = getComponentStyles((theme || 'nord') as ThemeType, 'weather');
  const [data, setData] = useState<SpaceWeatherData>({
    scales: null,
    alerts: [],
    kpIndex: null,
    solarWind: null,
    sunspots: null,
    xrayFlux: null,
    auroraForecast: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAllData = useCallback(async () => {
    try {
      // Don't block initial render - set loading to false early
      // so skeleton states render immediately

      // Helper to fetch with timeout for better LCP
      const fetchWithTimeout = async (url: string, timeoutMs = 3000): Promise<Response> => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        try {
          const response = await fetch(url, { signal: controller.signal });
          clearTimeout(timeoutId);
          return response;
        } catch (err) {
          clearTimeout(timeoutId);
          throw err;
        }
      };

      // Fetch all space weather data in parallel with timeouts
      const [scalesRes, alertsRes, kpRes, windRes, sunspotsRes, xrayRes, auroraRes] = await Promise.allSettled([
        fetchWithTimeout('/api/space-weather/scales'),
        fetchWithTimeout('/api/space-weather/alerts'),
        fetchWithTimeout('/api/space-weather/kp-index'),
        fetchWithTimeout('/api/space-weather/solar-wind'),
        fetchWithTimeout('/api/space-weather/sunspots'),
        fetchWithTimeout('/api/space-weather/xray-flux'),
        fetchWithTimeout('/api/space-weather/aurora'),
      ]);

      // Parse results with error handling for each
      const parseResult = async <T,>(result: PromiseSettledResult<Response>, defaultValue: T): Promise<T> => {
        if (result.status === 'fulfilled' && result.value.ok) {
          try {
            return await result.value.json();
          } catch {
            return defaultValue;
          }
        }
        return defaultValue;
      };

      // Parse and extract inner data from API response wrappers
      // API routes return { data/scales: {...}, source: '...' } wrappers
      const scalesWrapper = await parseResult<{ scales: SpaceWeatherScalesData } | null>(scalesRes, null);
      const alertsWrapper = await parseResult<{ alerts: SpaceWeatherAlert[] }>(alertsRes, { alerts: [] });
      const kpWrapper = await parseResult<{ data: KpIndexData } | null>(kpRes, null);
      const windWrapper = await parseResult<{ data: SolarWindData } | null>(windRes, null);
      const sunspotsWrapper = await parseResult<{ data: SunspotData } | null>(sunspotsRes, null);
      const xrayWrapper = await parseResult<{ data: XRayFluxData } | null>(xrayRes, null);
      const auroraWrapper = await parseResult<{ data: AuroraForecastData; kpIndex?: number } | null>(auroraRes, null);

      setData({
        scales: scalesWrapper?.scales ?? null,
        alerts: alertsWrapper.alerts || [],
        kpIndex: kpWrapper?.data ?? null,
        solarWind: windWrapper?.data ?? null,
        sunspots: sunspotsWrapper?.data ?? null,
        xrayFlux: xrayWrapper?.data ?? null,
        auroraForecast: auroraWrapper?.data ? {
          ...auroraWrapper.data,
          currentKp: auroraWrapper.kpIndex ?? 3,
        } : null,
      });
      setError(null);
    } catch (err) {
      console.error('[SpaceWeatherClient]', err);
      setError('Unable to load space weather data. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Use startTransition to allow initial paint before data fetching
    startTransition(() => {
      fetchAllData();
    });

    // Refresh data every 5 minutes
    const interval = setInterval(() => {
      startTransition(() => {
        fetchAllData();
      });
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchAllData]);

  return (
    <PageWrapper>
      <div className={cn('container mx-auto px-4 py-8', themeClasses.background)}>
        {/* Header Section */}
        <div className="mb-8">
          <h1
            className={cn(
              'text-3xl sm:text-4xl md:text-5xl font-extrabold mb-4 font-mono',
              themeClasses.accentText,
              themeClasses.glow
            )}
          >
            Space Weather Monitor
          </h1>
          <p className={cn('text-base sm:text-lg font-mono max-w-3xl', themeClasses.text)}>
            Live solar flare monitor and space weather tracker — Kp index, solar wind,
            geomagnetic storm alerts, and aurora forecast from NOAA SWPC, NASA SDO, and
            ESA/NASA SOHO.
          </p>
        </div>
          <ShareButtons
            config={{
              title: 'Space Weather Monitor — Solar Flare Tracker & Kp Index',
              text: 'Live space weather tracker: solar flares, Kp index, solar wind, and aurora forecast at 16bitweather.co',
              url: 'https://www.16bitweather.co/space-weather',
            }}
            className="mt-3"
          />

        {/* Error Display */}
        {error && (
          <div className={cn(
            'mb-6 p-4 border-4 border-red-500 bg-red-500/10 font-mono text-sm',
            'text-red-500'
          )}>
            {error}
          </div>
        )}

        {/* Main Terminal */}
        <Suspense fallback={
          <div className={cn('border-4 p-8 text-center font-mono', themeClasses.borderColor, themeClasses.background)}>
            <div className="animate-pulse">Initializing Solar Command Terminal...</div>
          </div>
        }>
          <SolarCommandTerminal
            scales={data.scales}
            alerts={data.alerts}
            kpIndex={data.kpIndex}
            solarWind={data.solarWind}
            sunspots={data.sunspots}
            xrayFlux={data.xrayFlux}
            auroraForecast={data.auroraForecast}
            isLoading={isLoading}
          />
        </Suspense>
      </div>
    </PageWrapper>
  );
}
