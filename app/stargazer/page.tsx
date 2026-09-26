'use client';

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
              'text-3xl sm:text-4xl font-extrabold mb-3 font-mono',
              themeClasses.accentText,
              themeClasses.glow,
            )}
          >
            STARGAZER
          </h1>
          <p className={cn('text-base sm:text-lg font-mono max-w-3xl', themeClasses.text)}>
            Find an hour to look up, choose what to try, and learn where to look.
            Start with your eyes, then explore the detailed sky forecast.
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
      <div className="min-h-[75vh]">
      <Suspense
        fallback={
          <p className="font-mono text-sm text-muted-foreground animate-pulse">Loading location…</p>
        }
      >
        <StargazerCommandCenter />
      </Suspense>
      </div>
      {/* Outside the Suspense boundary: the command center reads search params,
          so only this copy survives into the prerendered HTML. */}
      <StargazerSeoContent />
    </StargazerShell>
  );
}
