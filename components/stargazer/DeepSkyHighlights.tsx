'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useTheme } from '@/components/theme-provider';
import { getComponentStyles, type ThemeType } from '@/lib/theme-utils';
import type { DeepSkyHighlight } from '@/lib/stargazer/types';
import { formatTime } from '@/lib/stargazer/format';

interface DeepSkyHighlightsProps {
  highlights: DeepSkyHighlight[];
}

function formatType(type: string): string {
  return type
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

const difficultyColors: Record<string, string> = {
  beginner: 'bg-green-600 text-white',
  intermediate: 'bg-yellow-600 text-white',
  advanced: 'bg-red-600 text-white',
};

export default function DeepSkyHighlights({
  highlights,
}: DeepSkyHighlightsProps) {
  const { theme } = useTheme();
  const styles = getComponentStyles((theme || 'nord') as ThemeType, 'card');

  if (!highlights || highlights.length === 0) {
    return (
      <div
        className={cn(
          'container-primary p-4 font-mono',
          styles
        )}
      >
        <h2 className="text-xs font-mono uppercase text-muted-foreground">
          Deep Sky Highlights
        </h2>
        <p className="mt-2 text-xs font-mono">
          No deep sky objects visible tonight.
        </p>
      </div>
    );
  }

  const top8 = highlights.slice(0, 8);

  return (
    <div
      className={cn(
        'container-primary p-4 font-mono',
        styles
      )}
    >
      <h2 className="border-b border-subtle py-3 mb-3 text-xs font-mono uppercase text-muted-foreground">
        Deep Sky Highlights
      </h2>

      <div className="grid gap-3 sm:grid-cols-2">
        {top8.map((obj) => (
          <div
            key={obj.id}
            className="card-inner p-3 rounded"
          >
            <div className="mb-1 flex items-start justify-between gap-2">
              <Link href={`/stargazer/objects/${obj.id}`} className="hover:underline">
                <h3 className="text-sm font-bold text-cyan-400">
                  {obj.id} - {obj.name}
                </h3>
              </Link>
              <span
                className={cn(
                  'shrink-0 px-1.5 py-0.5 text-[10px] uppercase tracking-wider',
                  difficultyColors[obj.difficulty] ?? 'bg-gray-600 text-white'
                )}
              >
                {obj.difficulty}
              </span>
            </div>

            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {formatType(obj.type)} &middot; {obj.constellation}
            </p>

            <div className="mt-2 grid grid-cols-3 gap-1 text-[10px]">
              <div>
                <span className="text-muted-foreground">Mag</span>
                <p className="font-mono">
                  {obj.magnitude.toFixed(1)}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Alt</span>
                <p className="font-mono">
                  {Math.round(obj.maxAltitude)}&deg;
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Transit</span>
                <p className="font-mono">
                  {formatTime(obj.transitTime)}
                </p>
              </div>
            </div>

            <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
              {obj.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
