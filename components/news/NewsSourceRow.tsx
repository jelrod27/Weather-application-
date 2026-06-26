'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/components/theme-provider';
import { getComponentStyles, type ThemeType } from '@/lib/theme-utils';

interface NewsSourceRowProps {
  sources: string[];
  className?: string;
}

export default function NewsSourceRow({ sources, className }: NewsSourceRowProps) {
  const { theme } = useTheme();
  const themeClasses = getComponentStyles((theme || 'nord') as ThemeType, 'weather');

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
