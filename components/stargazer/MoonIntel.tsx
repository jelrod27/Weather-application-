'use client';

import { cn } from '@/lib/utils';
import { useTheme } from '@/components/theme-provider';
import { getComponentStyles, type ThemeType } from '@/lib/theme-utils';
import type { MoonInfo } from '@/lib/stargazer/types';
import { moonScore, getSubScoreLabel } from '@/lib/stargazer/score';
import { formatTime, formatDate } from '@/lib/stargazer/format';

interface MoonIntelProps {
  moon: MoonInfo;
}

function daysUntil(target: Date): number {
  const now = new Date();
  const diff = new Date(target).getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export default function MoonIntel({ moon }: MoonIntelProps) {
  const { theme } = useTheme();
  const styles = getComponentStyles((theme || 'nord') as ThemeType, 'card');
  const impactScore = moonScore(moon.illumination, moon.moonUpDuringDarkWindowPercent);
  const impactLabel = getSubScoreLabel('moon', impactScore);
  const impactColor = impactScore >= 75 ? 'text-green-500' : impactScore >= 50 ? 'text-yellow-500' : impactScore >= 25 ? 'text-orange-500' : 'text-red-500';

  return (
    <div
      className={cn(
        'container-primary p-4 font-mono',
        styles
      )}
    >
      <h2 className="border-b border-subtle py-3 mb-3 text-xs font-mono uppercase text-muted-foreground">
        Moon Intel
      </h2>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <p className="text-xs font-mono uppercase text-muted-foreground">Phase</p>
          <p className="text-xl font-bold font-mono">
            {moon.phaseName}
          </p>
        </div>
        <div>
          <p className="text-xs font-mono uppercase text-muted-foreground">
            Illumination
          </p>
          <p className="text-xl font-bold font-mono">
            {Math.round(moon.illumination)}%
          </p>
          <p className={cn('mt-1 text-xs font-mono', impactColor)}>
            Impact: {impactLabel}
          </p>
        </div>

        <div>
          <p className="text-xs font-mono uppercase text-muted-foreground">Moonrise</p>
          <p className="font-mono">{formatTime(moon.rise)}</p>
        </div>
        <div>
          <p className="text-xs font-mono uppercase text-muted-foreground">Moonset</p>
          <p className="font-mono">{formatTime(moon.set)}</p>
        </div>

        <div className="col-span-2 border-t border-subtle pt-2">
          <p className="text-xs font-mono uppercase text-muted-foreground">
            Dark Window
          </p>
          {moon.darkWindowStart && moon.darkWindowEnd ? (
            <p className="text-cyan-400">
              {formatTime(moon.darkWindowStart)} &ndash;{' '}
              {formatTime(moon.darkWindowEnd)}
            </p>
          ) : (
            <p className="font-mono">No dark window tonight</p>
          )}
          <p className="mt-1 text-muted-foreground">
            Moon up during dark window:{' '}
            {Math.round(moon.moonUpDuringDarkWindowPercent)}%
          </p>
        </div>

        <div>
          <p className="text-xs font-mono uppercase text-muted-foreground">
            Next New Moon
          </p>
          <p className="font-mono">
            {formatDate(moon.nextNewMoon)}{' '}
            <span className="text-muted-foreground">
              ({daysUntil(moon.nextNewMoon)}d)
            </span>
          </p>
        </div>
        <div>
          <p className="text-xs font-mono uppercase text-muted-foreground">
            Next Full Moon
          </p>
          <p className="font-mono">
            {formatDate(moon.nextFullMoon)}{' '}
            <span className="text-muted-foreground">
              ({daysUntil(moon.nextFullMoon)}d)
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
