/**
 * 16-Bit Weather Platform - Space Weather Charts Component
 *
 * Copyright (C) 2025 16-Bit Weather
 * Licensed under Fair Source License, Version 0.9
 *
 * Interactive time series charts for space weather data using Recharts.
 * Displays Bz, Bx, By, Bt, solar wind speed, density, temperature,
 * GOES magnetometer, X-ray flux, and proton flux in a responsive grid.
 */

'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Satellite } from 'lucide-react';
import { cn } from '@/lib/utils';
import { themeTokens } from '@/lib/theme-tokens';
import {
  ResponsiveContainer,
  LineChart,
  AreaChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';

// ── Types ───────────────────────────────────────────────────────────────────

type TimeRange = '30M' | '1H' | '2H' | '6H' | '24H' | '7D';

interface DataPoint {
  time: string;
  timestamp: number;
  value: number | null;
}

interface ChartConfig {
  id: string;
  title: string;
  unit: string;
  color: string;
  dataKey: string;
  source: 'plasma' | 'proton' | 'magnetometer' | 'xray';
  fieldPath: string;
  zeroLine?: boolean;
  logScale?: boolean;
  colorWhenNegative?: string;
}

interface ChartDataSets {
  plasma: Record<string, unknown>[];
  proton: Record<string, unknown>[];
  magnetometer: Record<string, unknown>[];
  xray: Record<string, unknown>[];
}

// ── Chart Configurations ────────────────────────────────────────────────────

const CHART_CONFIGS: ChartConfig[] = [
  {
    id: 'bz',
    title: 'Bz Component',
    unit: 'nT',
    color: '#06b6d4',
    dataKey: 'value',
    source: 'plasma',
    fieldPath: 'bz_gsm',
    zeroLine: true,
    colorWhenNegative: '#ef4444',
  },
  {
    id: 'goes-hp',
    title: 'GOES Magnetometer Hp',
    unit: 'nT',
    color: '#a855f7',
    dataKey: 'value',
    source: 'magnetometer',
    fieldPath: 'Hp',
  },
  {
    id: 'speed',
    title: 'Solar Wind Speed',
    unit: 'km/s',
    color: '#22c55e',
    dataKey: 'value',
    source: 'plasma',
    fieldPath: 'speed',
  },
  {
    id: 'density',
    title: 'Proton Density',
    unit: 'p/cm\u00B3',
    color: '#eab308',
    dataKey: 'value',
    source: 'plasma',
    fieldPath: 'density',
  },
  {
    id: 'bx',
    title: 'Bx Component',
    unit: 'nT',
    color: '#f97316',
    dataKey: 'value',
    source: 'plasma',
    fieldPath: 'bx_gsm',
    zeroLine: true,
  },
  {
    id: 'by',
    title: 'By Component',
    unit: 'nT',
    color: '#ec4899',
    dataKey: 'value',
    source: 'plasma',
    fieldPath: 'by_gsm',
    zeroLine: true,
  },
  {
    id: 'bt',
    title: 'Bt Total Field',
    unit: 'nT',
    color: '#06b6d4',
    dataKey: 'value',
    source: 'plasma',
    fieldPath: 'bt',
  },
  {
    id: 'temperature',
    title: 'Temperature',
    unit: 'K',
    color: '#ef4444',
    dataKey: 'value',
    source: 'plasma',
    fieldPath: 'temperature',
  },
  {
    id: 'xray',
    title: 'X-ray Flux',
    unit: 'W/m\u00B2',
    color: '#eab308',
    dataKey: 'value',
    source: 'xray',
    fieldPath: 'flux',
    logScale: true,
  },
  {
    id: 'proton',
    title: 'Proton Flux',
    unit: 'pfu',
    color: '#f97316',
    dataKey: 'value',
    source: 'proton',
    fieldPath: 'flux',
    logScale: true,
  },
];

const TIME_RANGES: { label: string; value: TimeRange }[] = [
  { label: '30M', value: '30M' },
  { label: '1H', value: '1H' },
  { label: '2H', value: '2H' },
  { label: '6H', value: '6H' },
  { label: '24H', value: '24H' },
  { label: '7D', value: '7D' },
];

// ── Helpers ─────────────────────────────────────────────────────────────────

function getMinutesForRange(range: TimeRange): number {
  switch (range) {
    case '30M': return 30;
    case '1H': return 60;
    case '2H': return 120;
    case '6H': return 360;
    case '24H': return 1440;
    case '7D': return 10080;
  }
}

function filterByRange(
  data: Record<string, unknown>[],
  range: TimeRange
): Record<string, unknown>[] {
  const minutes = getMinutesForRange(range);
  const cutoff = Date.now() - minutes * 60 * 1000;
  return data.filter((d) => {
    const tag = d.time as string | undefined;
    return tag ? new Date(tag).getTime() >= cutoff : false;
  });
}

function extractTimeSeries(
  rawData: Record<string, unknown>[],
  fieldPath: string,
  range: TimeRange
): DataPoint[] {
  const filtered = filterByRange(rawData, range);
  return filtered.map((d) => {
    const raw = d[fieldPath];
    const val = typeof raw === 'number' ? raw : typeof raw === 'string' ? parseFloat(raw) : null;
    const time = new Date(d.time as string);
    return {
      time: time.toISOString(),
      timestamp: time.getTime(),
      value: val !== null && !isNaN(val as number) ? (val as number) : null,
    };
  });
}

function getStats(points: DataPoint[]): { current: number | null; max: number | null; min: number | null } {
  const valid = points.filter((p) => p.value !== null).map((p) => p.value as number);
  if (valid.length === 0) return { current: null, max: null, min: null };
  return {
    current: valid[valid.length - 1],
    max: Math.max(...valid),
    min: Math.min(...valid),
  };
}

function formatValue(value: number | null, logScale?: boolean): string {
  if (value === null) return '--';
  if (logScale) {
    if (value === 0) return '0';
    const exp = Math.floor(Math.log10(Math.abs(value)));
    const mantissa = value / Math.pow(10, exp);
    return `${mantissa.toFixed(1)}e${exp}`;
  }
  if (Math.abs(value) >= 1000000) return value.toExponential(1);
  if (Math.abs(value) >= 100) return value.toFixed(0);
  if (Math.abs(value) >= 1) return value.toFixed(1);
  return value.toPrecision(3);
}

function formatTickTime(timestamp: number, range: TimeRange): string {
  const d = new Date(timestamp);
  if (range === '7D') {
    return `${(d.getUTCMonth() + 1).toString().padStart(2, '0')}/${d.getUTCDate().toString().padStart(2, '0')}`;
  }
  return `${d.getUTCHours().toString().padStart(2, '0')}:${d.getUTCMinutes().toString().padStart(2, '0')}`;
}

// ── Custom Tooltip ──────────────────────────────────────────────────────────

interface ChartTooltipProps {
  active?: boolean;
  payload?: { value: number | null }[];
  label?: number;
  unit: string;
  logScale?: boolean;
}

function ChartTooltip({ active, payload, label, unit, logScale }: ChartTooltipProps) {
  if (!active || !payload || !payload.length || label === undefined) return null;
  const d = new Date(label);
  const timeStr = `${d.getUTCFullYear()}-${(d.getUTCMonth() + 1).toString().padStart(2, '0')}-${d.getUTCDate().toString().padStart(2, '0')} ${d.getUTCHours().toString().padStart(2, '0')}:${d.getUTCMinutes().toString().padStart(2, '0')} UTC`;
  const val = payload[0].value;

  return (
    <div className="bg-gray-900 border border-gray-600 px-3 py-2 font-mono text-xs shadow-lg">
      <div className="text-gray-400 mb-1">{timeStr}</div>
      <div className="text-white font-bold">
        {formatValue(val, logScale)} {unit}
      </div>
    </div>
  );
}

// ── Single Chart Card ───────────────────────────────────────────────────────

interface ChartCardProps {
  config: ChartConfig;
  data: DataPoint[];
  range: TimeRange;
}

function ChartCard({ config, data, range }: ChartCardProps) {
  const stats = useMemo(() => getStats(data), [data]);
  const { title, unit, color, zeroLine, logScale, colorWhenNegative } = config;

  const useAreaChart = !!colorWhenNegative && zeroLine;

  return (
    <div className="border border-border rounded bg-transparent p-3 font-mono">
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <div className="text-xs font-bold uppercase text-gray-300 truncate">
          {title}
        </div>
        <div className="flex items-center gap-2 text-xs shrink-0">
          <span style={{ color }} className="font-bold">
            {formatValue(stats.current, logScale)} {unit}
          </span>
        </div>
      </div>

      {/* Min / Max */}
      <div className="flex gap-3 text-[10px] text-gray-500 mb-2">
        <span>
          MAX: <span className="text-gray-400">{formatValue(stats.max, logScale)}</span>
        </span>
        <span>
          MIN: <span className="text-gray-400">{formatValue(stats.min, logScale)}</span>
        </span>
      </div>

      {/* Chart */}
      <div className="h-40">
        {data.length === 0 ? (
          <div className="flex items-center justify-center h-full text-xs text-gray-600">
            No data available
          </div>
        ) : useAreaChart ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
              <defs>
                <linearGradient id={`grad-${config.id}-pos`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={color} stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis
                dataKey="timestamp"
                type="number"
                domain={['dataMin', 'dataMax']}
                tickFormatter={(t: number) => formatTickTime(t, range)}
                tick={{ fontSize: 9, fill: '#666' }}
                stroke="#444"
              />
              <YAxis
                tick={{ fontSize: 9, fill: '#666' }}
                stroke="#444"
                width={40}
              />
              <Tooltip content={<ChartTooltip unit={unit} logScale={logScale} />} />
              <ReferenceLine y={0} stroke="#666" strokeDasharray="4 2" />
              <Area
                type="monotone"
                dataKey="value"
                stroke={color}
                strokeWidth={1.5}
                fill={`url(#grad-${config.id}-pos)`}
                connectNulls
                dot={false}
                activeDot={{ r: 3, fill: color }}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis
                dataKey="timestamp"
                type="number"
                domain={['dataMin', 'dataMax']}
                tickFormatter={(t: number) => formatTickTime(t, range)}
                tick={{ fontSize: 9, fill: '#666' }}
                stroke="#444"
              />
              <YAxis
                tick={{ fontSize: 9, fill: '#666' }}
                stroke="#444"
                width={40}
                scale={logScale ? 'log' : 'auto'}
                domain={logScale ? ['auto', 'auto'] : undefined}
                allowDataOverflow={logScale}
              />
              <Tooltip content={<ChartTooltip unit={unit} logScale={logScale} />} />
              {zeroLine && <ReferenceLine y={0} stroke="#666" strokeDasharray="4 2" />}
              <Line
                type="monotone"
                dataKey="value"
                stroke={color}
                strokeWidth={1.5}
                dot={false}
                connectNulls
                activeDot={{ r: 3, fill: color }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────

export default function SpaceWeatherCharts() {
  const themeClasses = themeTokens.weather;

  const [range, setRange] = useState<TimeRange>('2H');
  const [datasets, setDatasets] = useState<ChartDataSets>({
    plasma: [],
    proton: [],
    magnetometer: [],
    xray: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (selectedRange: TimeRange) => {
    setIsLoading(true);
    setError(null);

    try {
      const results = await Promise.allSettled([
        fetch(`/api/space-weather/plasma?range=${selectedRange.toLowerCase()}`).then((r) => {
          if (!r.ok) throw new Error(`Plasma fetch failed: ${r.status}`);
          return r.json();
        }),
        fetch('/api/space-weather/proton-flux').then((r) => {
          if (!r.ok) throw new Error(`Proton flux fetch failed: ${r.status}`);
          return r.json();
        }),
        fetch('/api/space-weather/magnetometer').then((r) => {
          if (!r.ok) throw new Error(`Magnetometer fetch failed: ${r.status}`);
          return r.json();
        }),
        fetch('/api/space-weather/xray-flux').then((r) => {
          if (!r.ok) throw new Error(`X-ray flux fetch failed: ${r.status}`);
          return r.json();
        }),
      ]);

      const plasmaData =
        results[0].status === 'fulfilled' && Array.isArray(results[0].value)
          ? results[0].value
          : [];
      const protonData =
        results[1].status === 'fulfilled' && Array.isArray(results[1].value)
          ? results[1].value
          : [];
      const magnetometerData =
        results[2].status === 'fulfilled' && Array.isArray(results[2].value)
          ? results[2].value
          : [];
      const xrayRaw = results[3].status === 'fulfilled' ? results[3].value : null;
      const xrayData = xrayRaw
        ? (Array.isArray(xrayRaw) ? xrayRaw : (xrayRaw.data?.recent || []).map((d: Record<string, unknown>) => ({ time: d.timeTag, flux: d.flux })))
        : [];

      setDatasets({
        plasma: plasmaData,
        proton: protonData,
        magnetometer: magnetometerData,
        xray: xrayData,
      });

      const allFailed = results.every((r) => r.status === 'rejected');
      if (allFailed) {
        setError('Failed to fetch space weather data. Please try again.');
      }
    } catch (err) {
      console.error('[SpaceWeatherCharts]', err);
      setError('An unexpected error occurred while fetching data.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(range);
  }, [range, fetchData]);

  const chartDataMap = useMemo(() => {
    const map: Record<string, DataPoint[]> = {};
    for (const config of CHART_CONFIGS) {
      const rawData = datasets[config.source];
      map[config.id] = extractTimeSeries(rawData, config.fieldPath, range);
    }
    return map;
  }, [datasets, range]);

  return (
    <div className={cn('space-y-4', themeClasses.background)}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <Satellite className="w-5 h-5 text-cyan-500" />
          <h2 className={cn('text-lg font-mono font-bold uppercase', themeClasses.headerText)}>
            Space Weather Charts
          </h2>
        </div>

        {/* Time range selector */}
        <div className="flex gap-1 font-mono text-xs">
          {TIME_RANGES.map((tr) => (
            <button
              key={tr.value}
              onClick={() => setRange(tr.value)}
              className={cn(
                'px-2.5 py-1.5 border transition-colors rounded-sm',
                range === tr.value
                  ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400'
                  : 'border-gray-600 text-gray-400 hover:border-gray-400 hover:text-gray-300'
              )}
              aria-pressed={range === tr.value}
              aria-label={`Set time range to ${tr.label}`}
            >
              {tr.label}
            </button>
          ))}
        </div>
      </div>

      {/* Earth position marker */}
      <div className="text-[10px] font-mono text-gray-500 flex items-center gap-1.5">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-cyan-500" />
        Earth ~72min propagation from DSCOVR at L1
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="border border-border rounded bg-transparent p-3 h-56 flex items-center justify-center"
            >
              <div className="text-gray-500 font-mono text-xs animate-pulse">
                Loading...
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error state */}
      {error && !isLoading && (
        <div className="border border-red-500/50 rounded bg-red-500/10 p-4 text-center">
          <div className="text-red-400 font-mono text-sm">{error}</div>
          <button
            onClick={() => fetchData(range)}
            className="mt-2 text-xs font-mono text-cyan-400 hover:text-cyan-300 underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Charts grid */}
      {!isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {CHART_CONFIGS.map((config) => (
            <ChartCard
              key={config.id}
              config={config}
              data={chartDataMap[config.id] ?? []}
              range={range}
            />
          ))}
        </div>
      )}

      {/* Footer */}
      <div className={cn(
        'text-center text-[10px] font-mono py-2 border-t border-gray-700',
        themeClasses.text,
        'opacity-60'
      )}>
        DATA: NOAA SWPC DSCOVR, GOES MAGNETOMETER, GOES X-RAY SENSOR, GOES PROTON SENSOR
      </div>
    </div>
  );
}
