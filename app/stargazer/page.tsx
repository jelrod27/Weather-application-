'use client';

/**
 * 16-Bit Weather Platform - Stargazer Command Center
 *
 * Tabbed command center layout for astrophotography forecasting.
 * Matches space weather page patterns with persistent header card,
 * tab navigation, and organized content sections.
 */

import React, { Suspense } from 'react';
import { cn } from '@/lib/utils';
import { themeTokens } from '@/lib/theme-tokens';
import PageWrapper from '@/components/page-wrapper';
import { ShareButtons } from '@/components/share-buttons';
import { formatTonightDate } from '@/lib/stargazer/bortle';
import StargazerCommandCenter from '@/components/stargazer/StargazerCommandCenter';

function StargazerShell({ children }: { children: React.ReactNode }) {
  const themeClasses = themeTokens.weather;

  return (
    <PageWrapper>
      <div className={cn('container mx-auto px-4 py-8', themeClasses.background)}>
        <div className="mb-8">
          <h1
            data-testid="stargazer-page-title"
            className={cn(
              'text-4xl sm:text-5xl md:text-6xl font-extrabold mb-4 font-mono',
              themeClasses.accentText,
              themeClasses.glow,
            )}
          >
            STARGAZER COMMAND CENTER
          </h1>
          <p className={cn('text-base sm:text-lg font-mono max-w-3xl', themeClasses.text)}>
            Tonight&apos;s astrophotography forecast. Seeing, transparency, moon phase, planet
            visibility, deep sky targets, ISS passes, and upcoming launches -- all in one place.
          </p>
          <p className="text-sm font-mono text-muted-foreground mt-2">
            Tonight: {formatTonightDate(new Date())}
          </p>
        </div>

        <ShareButtons
          config={{
            title: 'Stargazer - Astrophotography Forecast',
            text: "Tonight's stargazing conditions at 16bitweather.co",
            url: 'https://www.16bitweather.co/stargazer',
          }}
          className="mt-3 mb-6"
        />

        {children}
      </div>
    </PageWrapper>
  );
}

export default function StargazerPage() {
  return (
    <StargazerShell>
      <Suspense
        fallback={
          <p className="font-mono text-sm text-muted-foreground animate-pulse">Loading location…</p>
        }
      >
        <StargazerCommandCenter />
      </Suspense>
    </StargazerShell>
  );
}
