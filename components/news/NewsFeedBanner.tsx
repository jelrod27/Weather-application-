'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/components/theme-provider';
import { getComponentStyles, type ThemeType } from '@/lib/theme-utils';

interface NewsFeedBannerProps {
  errorCount: number;
  className?: string;
}

export default function NewsFeedBanner({ errorCount, className }: NewsFeedBannerProps) {
  const { theme } = useTheme();
  const themeClasses = getComponentStyles((theme || 'nord') as ThemeType, 'weather');

  if (errorCount <= 0) return null;

  return (
    <div
      className={cn(
        'mb-4 flex items-start gap-3 rounded border-2 border-yellow-500/60 bg-yellow-500/10 px-4 py-3 font-mono text-sm',
        className,
      )}
      role="status"
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-500" aria-hidden="true" />
      <p className={themeClasses.text}>
        {errorCount} feed source{errorCount === 1 ? '' : 's'} unavailable — showing partial results.
      </p>
    </div>
  );
}
