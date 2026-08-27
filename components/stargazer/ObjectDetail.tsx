'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { themeTokens } from '@/lib/theme-tokens';
import type { DeepSkyObject } from '@/lib/stargazer/types';
import TonightVisibility from '@/components/stargazer/TonightVisibility';

interface ObjectDetailProps {
  object: DeepSkyObject;
}

function formatType(type: string): string {
  return type
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function formatMonths(months: number[]): string {
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  if (months.length === 0 || months.length === 12) return 'Year-round';
  if (months.length === 1) return names[months[0] - 1];
  const sorted = [...months].sort((a, b) => a - b);
  const isContiguous = sorted.every((m, i) =>
    i === 0 || sorted[i] - sorted[i - 1] === 1
  );
  if (!isContiguous) return sorted.map((m) => names[m - 1]).join(', ');
  return `${names[months[0] - 1]}-${names[months[months.length - 1] - 1]}`;
}

const difficultyColors: Record<string, string> = {
  beginner: 'text-green-500',
  intermediate: 'text-yellow-500',
  advanced: 'text-red-500',
};

export default function ObjectDetail({ object: obj }: ObjectDetailProps) {
  const styles = themeTokens.card;

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4 font-mono">
      {/* Header */}
      <div className={cn('container-primary p-4', styles)}>
        <Link
          href="/stargazer#targets"
          className="text-xs uppercase tracking-wider text-cyan-400 hover:underline"
        >
          {'\u25C0'} Back to Stargazer
        </Link>

        <h1 className="mt-3 text-xl font-bold text-cyan-400">
          {obj.id} - {obj.name.toUpperCase()}
        </h1>
        {obj.altNames.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Also known as: {obj.altNames.join(', ')}
          </p>
        )}
      </div>

      {/* Quick Facts + Description */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className={cn('container-primary p-4 md:col-span-1', styles)}>
          <h2 className="border-b border-subtle pb-2 mb-3 text-xs uppercase tracking-wider text-muted-foreground">
            Quick Facts
          </h2>
          <dl className="space-y-2 text-xs">
            <div>
              <dt className="text-muted-foreground">Type</dt>
              <dd>{formatType(obj.type)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Constellation</dt>
              <dd>{obj.constellation}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Distance</dt>
              <dd>{obj.distance}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Magnitude</dt>
              <dd>{obj.magnitude.toFixed(1)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Size</dt>
              <dd>{obj.size}</dd>
            </div>
            {obj.discoveredBy && (
              <div>
                <dt className="text-muted-foreground">Discovered By</dt>
                <dd>{obj.discoveredBy}</dd>
              </div>
            )}
            <div className="border-t border-subtle pt-2">
              <dt className="text-muted-foreground">Viewing</dt>
              <dd className="mt-1 space-y-1">
                <p>Naked Eye: {obj.nakedEyeVisible === true ? 'Yes' : obj.nakedEyeVisible === false ? 'No' : '—'}</p>
                <p>Binoculars: {obj.binocularTarget === true ? 'Yes' : obj.binocularTarget === false ? 'No' : '—'}</p>
                {obj.telescopeMinAperture && (
                  <p>Min Scope: {obj.telescopeMinAperture}</p>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Difficulty</dt>
              <dd className={cn('uppercase', difficultyColors[obj.difficulty])}>
                {obj.difficulty}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Best Months</dt>
              <dd>{formatMonths(obj.bestMonths)}</dd>
            </div>
          </dl>
        </div>

        <div className={cn('container-primary p-4 md:col-span-2', styles)}>
          <h2 className="border-b border-subtle pb-2 mb-3 text-xs uppercase tracking-wider text-muted-foreground">
            What Is It?
          </h2>
          <div className="space-y-3 text-xs leading-relaxed">
            {obj.longDescription ? (
              <p>{obj.longDescription}</p>
            ) : (
              <p>{obj.description}</p>
            )}
            {obj.physicalProperties && (
              <p className="text-muted-foreground">{obj.physicalProperties}</p>
            )}
          </div>
        </div>
      </div>

      {/* Imaging Tips */}
      <div className={cn('container-primary p-4', styles)}>
        <h2 className="border-b border-subtle pb-2 mb-3 text-xs uppercase tracking-wider text-muted-foreground">
          Imaging Tips
        </h2>
        <p className="text-xs leading-relaxed">{obj.imagingTips}</p>
      </div>

      {/* Notable Features */}
      {obj.notableFeatures && (
        <div className={cn('container-primary p-4', styles)}>
          <h2 className="border-b border-subtle pb-2 mb-3 text-xs uppercase tracking-wider text-muted-foreground">
            Notable Features
          </h2>
          <p className="text-xs leading-relaxed">{obj.notableFeatures}</p>
        </div>
      )}

      {/* Tonight's Visibility */}
      <TonightVisibility ra={obj.ra} dec={obj.dec} objectName={obj.name} />

      {/* Wikipedia link */}
      {obj.wikipediaSlug && (
        <div className="text-xs">
          <a
            href={`https://en.wikipedia.org/wiki/${obj.wikipediaSlug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan-400 hover:underline"
          >
            Learn more: Wikipedia {'\u2197'}
          </a>
        </div>
      )}
    </div>
  );
}
