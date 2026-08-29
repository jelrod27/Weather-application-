'use client';

import { cn } from '@/lib/utils';
import { themeTokens } from '@/lib/theme-tokens';
import type { HourlyCondition, DarkWindow } from '@/lib/stargazer/types';
import { formatTime } from '@/lib/stargazer/format';

interface HourlyTimelineProps {
  conditions: HourlyCondition[];
  darkWindow: DarkWindow;
}

type MetricKey =
  | 'cloudCover'
  | 'cloudCoverLow'
  | 'cloudCoverMid'
  | 'cloudCoverHigh'
  | 'seeing'
  | 'transparency'
  | 'windSpeed'
  | 'humidity'
  | 'temperature'
  | 'dewRisk';

const metricLabels: Record<MetricKey, string> = {
  cloudCover: 'Cloud Cover',
  cloudCoverLow: 'Low Clouds',
  cloudCoverMid: 'Mid Clouds',
  cloudCoverHigh: 'High Clouds',
  seeing: 'Seeing',
  transparency: 'Transparency',
  windSpeed: 'Wind',
  humidity: 'Humidity',
  temperature: 'Temp',
  dewRisk: 'Dew Risk',
};

function getCellColor(metric: MetricKey, value: number | string): string {
  if (metric === 'dewRisk') {
    if (value === 'low') return 'bg-green-600';
    if (value === 'moderate') return 'bg-yellow-600';
    return 'bg-red-600';
  }

  if (metric === 'seeing' || metric === 'transparency') {
    // 7Timer: 1 = best, 8 = worst -- lower is better
    const v = value as number;
    if (v <= 2) return 'bg-green-600';
    if (v <= 3) return 'bg-yellow-600';
    if (v <= 4) return 'bg-orange-600';
    return 'bg-red-600';
  }

  if (metric === 'windSpeed') {
    const v = value as number;
    if (v <= 10) return 'bg-green-600';
    if (v <= 20) return 'bg-yellow-600';
    if (v <= 30) return 'bg-orange-600';
    return 'bg-red-600';
  }

  if (metric === 'humidity') {
    const v = value as number;
    if (v <= 60) return 'bg-green-600';
    if (v <= 75) return 'bg-yellow-600';
    if (v <= 85) return 'bg-orange-600';
    return 'bg-red-600';
  }

  if (metric === 'temperature') {
    return 'bg-blue-600';
  }

  // Cloud cover metrics (lower is better)
  const v = value as number;
  if (v <= 20) return 'bg-green-600';
  if (v <= 50) return 'bg-yellow-600';
  if (v <= 75) return 'bg-orange-600';
  return 'bg-red-600';
}

function formatCellValue(metric: MetricKey, value: number | string): string {
  if (metric === 'dewRisk') return String(value).charAt(0).toUpperCase();
  if (metric === 'temperature') return `${Math.round(value as number)}°`;
  if (metric === 'windSpeed') return `${Math.round(value as number)}`;
  if (metric === 'humidity' || metric.startsWith('cloudCover'))
    return `${Math.round(value as number)}%`;
  return String(Math.round(value as number));
}

const metrics: MetricKey[] = [
  'cloudCover',
  'cloudCoverLow',
  'cloudCoverMid',
  'cloudCoverHigh',
  'seeing',
  'transparency',
  'windSpeed',
  'humidity',
  'temperature',
  'dewRisk',
];

function getScoreRowColor(score: number): string {
  if (score >= 75) return 'bg-emerald-600';
  if (score >= 60) return 'bg-green-600';
  if (score >= 45) return 'bg-yellow-600';
  if (score >= 30) return 'bg-orange-600';
  return 'bg-red-600';
}

export default function HourlyTimeline({
  conditions,
  darkWindow,
}: HourlyTimelineProps) {
  const styles = themeTokens.card;

  if (!conditions || conditions.length === 0) {
    return (
      <div
        className={cn(
          'container-primary p-4 font-mono',
          styles
        )}
      >
        <h2 className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
          Hourly Forecast
        </h2>
        <p className="mt-2 text-xs font-mono text-muted-foreground">
          No hourly data available.
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'container-primary p-4 font-mono',
        styles
      )}
    >
      <h2 className="mb-1 text-xs font-mono uppercase tracking-wider text-muted-foreground">
        Hourly Forecast
      </h2>
      <p className="mb-3 text-xs font-mono text-muted-foreground">
        Dark window: {formatTime(darkWindow.sunset)} &ndash;{' '}
        {formatTime(darkWindow.sunrise)}
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th className="sticky left-0 bg-inherit px-2 py-1 text-left text-xs font-mono uppercase tracking-wider text-muted-foreground">
                Metric
              </th>
              {conditions.map((c, i) => (
                <th
                  key={i}
                  className="min-w-[3rem] px-1 py-1 text-center text-xs font-mono text-muted-foreground"
                >
                  {formatTime(c.time)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Per-hour composite score row — guide rail at the top */}
            <tr className="font-bold">
              <td className="sticky left-0 bg-inherit px-2 py-1.5 text-xs font-mono font-bold uppercase tracking-wider text-foreground">
                Score
              </td>
              {conditions.map((c, i) => (
                <td
                  key={i}
                  className={cn(
                    'border border-subtle px-1 py-1.5 text-center text-white text-sm font-mono font-bold',
                    c.hourlyScore != null ? getScoreRowColor(c.hourlyScore) : 'bg-gray-600',
                  )}
                >
                  {c.hourlyScore != null ? c.hourlyScore : '--'}
                </td>
              ))}
            </tr>
            {metrics.map((metric) => (
              <tr key={metric}>
                <td className="sticky left-0 bg-inherit px-2 py-1 text-xs font-mono uppercase tracking-wider text-muted-foreground">
                  {metricLabels[metric]}
                  {metric === 'cloudCoverHigh' && conditions.some((c) => c.cirrusWarning) && (
                    <span className="ml-1 text-amber-400" title="Cirrus penalty active">*</span>
                  )}
                </td>
                {conditions.map((c, i) => {
                  const raw = c[metric as keyof HourlyCondition];
                  const value =
                    raw instanceof Date ? raw.toISOString() : raw;
                  return (
                    <td
                      key={i}
                      className={cn(
                        'border border-subtle px-1 py-1 text-center text-white text-xs font-mono',
                        getCellColor(metric, value as number | string),
                        metric === 'cloudCoverHigh' && c.cirrusWarning && 'ring-1 ring-inset ring-amber-400/60',
                      )}
                    >
                      {formatCellValue(metric, value as number | string)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
