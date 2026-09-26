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
import StargazerCommandCenter from '@/components/stargazer/StargazerCommandCenter';
import StargazerSeoContent from '@/components/stargazer/stargazer-seo-content';

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
        </div>

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
      {/* Outside the Suspense boundary: the command center reads search params,
          so only this copy survives into the prerendered HTML. */}
      <StargazerSeoContent />
    </StargazerShell>
  );
}
