'use client';

import { cn } from '@/lib/utils';
import { themeTokens } from '@/lib/theme-tokens';
import type { HourlyCondition, DarkWindow } from '@/lib/stargazer/types';
import { formatTime } from '@/lib/stargazer/format';
import { formatObservingTime } from '@/lib/stargazer/context';
import { useStargazerUnits } from '@/hooks/useStargazerUnits';

interface HourlyTimelineProps {
  timeZone?: string;
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

function getCellColor(metric: MetricKey, value: number | string | null): string {
  if (value == null) return 'bg-gray-600';
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

function formatCellValue(metric: MetricKey, value: number | string | null): string {
  if (value == null) return 'Unavailable';
  if (metric === 'dewRisk') return String(value);
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

export default function HourlyTimeline({ timeZone = 'UTC',
  conditions,
  darkWindow,
}: HourlyTimelineProps) {
  const styles = themeTokens.card;
  const units = useStargazerUnits();

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
        Dark window: {darkWindow.status === 'none' ? 'No astronomical darkness' : darkWindow.status === 'continuous' ? 'Continuous darkness (next 24 hours)' : <>{formatTime(darkWindow.astronomicalDusk, timeZone)} &ndash; {formatTime(darkWindow.astronomicalDawn, timeZone)}</>}
      </p>

      <p className="mb-3 text-xs text-muted-foreground">Seeing and transparency: 1/8 is best, 8/8 is worst. Photography scores use /100. Unavailable means a required reading is missing.</p>
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
                  {formatObservingTime(new Date(c.time).getTime(), timeZone)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Per-hour composite score row — guide rail at the top */}
            <tr className="font-bold">
              <td className="sticky left-0 bg-inherit px-2 py-1.5 text-xs font-mono font-bold uppercase tracking-wider text-foreground">
                Photography /100
              </td>
              {conditions.map((c, i) => (
                <td
                  key={i}
                  className={cn(
                    'border border-subtle px-1 py-1.5 text-center text-white text-sm font-mono font-bold',
                    c.hourlyScore != null ? getScoreRowColor(c.hourlyScore) : 'bg-gray-600',
                  )}
                >
                  {c.hourlyScore != null ? c.hourlyScore : 'Unavailable'}
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
                  const value = c[metric];
                  return (
                    <td
                      key={i}
                      className={cn(
                        'border border-subtle px-1 py-1 text-center text-white text-xs font-mono',
                        getCellColor(metric, value),
                        metric === 'cloudCoverHigh' && c.cirrusWarning && 'ring-1 ring-inset ring-amber-400/60',
                      )}
                    >
                      {metric === 'temperature' ? units.temperature(c.temperature) : metric === 'windSpeed' ? units.wind(c.windSpeed) : formatCellValue(metric, value)}
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
