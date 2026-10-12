'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { themeTokens } from '@/lib/theme-tokens';
import { visualTime } from '@/lib/news/visuals';
import { safeExternalUrl } from '@/lib/safe-url';
import type { NewsSourceHealth } from '@/lib/news/types';

interface NewsSourceRowProps {
  sources: string[];
  health?: NewsSourceHealth[];
  className?: string;
}

export default function NewsSourceRow({ sources, health, className }: NewsSourceRowProps): React.ReactElement | null {
  const themeClasses = themeTokens.weather;

  if (health?.length) return (
    <details className={cn('my-4 border border-subtle rounded p-3 text-xs font-mono', className)}>
      <summary className="cursor-pointer font-bold">Source coverage</summary>
      <ul className="mt-3 space-y-3">
        {health.map(source => <li key={source.id}>
          <p><a href={safeExternalUrl(source.url) ?? undefined} target="_blank" rel="noopener noreferrer" className="underline">{source.name}</a> · {source.state}</p>
          <p>{source.coverage}</p>
          <p>{source.lastSuccessAt ? `Last successful check: ${visualTime(source.lastSuccessAt)}` : 'No successful source check available'}</p>
          <p>{source.accepted} accepted of {source.received} received{source.truncated ? ' · incomplete feed' : ''}{source.rejected ? ` · ${source.rejected} rejected` : ''}</p>
          {source.issues.map(issue => <p key={issue}>{issue}</p>)}
        </li>)}
      </ul>
    </details>
  );
  if (sources.length === 0) return null;

  return (
    <div className={cn('mt-4 flex flex-wrap justify-center gap-2', className)}>
      {sources.map((source) => (
        <span
          key={source}
          className={cn(
            'rounded border border-subtle px-2 py-0.5 text-[10px] font-mono uppercase tracking-wide opacity-80',
            themeClasses.text,
          )}
        >
          {source}
        </span>
      ))}
    </div>
  );
}
