/**
 * Featured hero card for the largest quake in the visible list.
 *
 * Auto-hides below M4.5 — when nothing significant has happened it's
 * visual padding, not information. Pulsing LIVE dot, time-ago, location,
 * depth, and a TSUNAMI pill when the USGS record carries that flag.
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { formatTimeAgo } from '@/lib/format-time-ago';
import type { ClientEarthquake } from './earth-sciences-client';
import { safeExternalUrl } from '@/lib/safe-url';

const HERO_MIN_MAGNITUDE = 4.5;

function magnitudeTier(mag: number): {
  bg: string;
  text: string;
  border: string;
  glow: string;
  label: string;
} {
  if (mag >= 7) {
    return {
      bg: 'bg-red-500/10',
      text: 'text-red-400',
      border: 'border-red-500/60',
      glow: 'shadow-[0_0_40px_rgba(239,68,68,0.25)]',
      label: 'MAJOR',
    };
  }
  if (mag >= 6) {
    return {
      bg: 'bg-red-500/10',
      text: 'text-red-400',
      border: 'border-red-500/50',
      glow: 'shadow-[0_0_30px_rgba(239,68,68,0.2)]',
      label: 'STRONG',
    };
  }
  if (mag >= 5) {
    return {
      bg: 'bg-orange-500/10',
      text: 'text-orange-400',
      border: 'border-orange-500/50',
      glow: 'shadow-[0_0_24px_rgba(249,115,22,0.18)]',
      label: 'MODERATE',
    };
  }
  return {
    bg: 'bg-yellow-500/10',
    text: 'text-yellow-400',
    border: 'border-yellow-500/50',
    glow: 'shadow-[0_0_20px_rgba(234,179,8,0.15)]',
    label: 'LIGHT',
  };
}

export interface QuakeHeroCardProps {
  quake: ClientEarthquake | null;
}

export default function QuakeHeroCard({ quake }: QuakeHeroCardProps) {
  if (!quake || quake.magnitude < HERO_MIN_MAGNITUDE) return null;

  const tier = magnitudeTier(quake.magnitude);
  const safeUrl = safeExternalUrl(quake.url);

  const cardClass = cn(
    'group relative block overflow-hidden rounded-lg border-2 p-5 md:p-6 transition-all',
    'bg-gradient-to-br from-background to-background/60',
    tier.border,
    tier.glow,
    safeUrl && 'hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'
  );

  const ariaLabel = `Featured earthquake: magnitude ${quake.magnitude.toFixed(1)} ${quake.location}`;
  const Wrapper = safeUrl
    ? ({ children }: { children: React.ReactNode }) => (
        <a
          href={safeUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={ariaLabel}
          data-testid="quake-hero-card"
          className={cardClass}
        >
          {children}
        </a>
      )
    : ({ children }: { children: React.ReactNode }) => (
        <div
          aria-label={ariaLabel}
          data-testid="quake-hero-card"
          className={cardClass}
        >
          {children}
        </div>
      );

  return (
    <Wrapper>
      {/* Scanline / retro overlay */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.08] [background-image:linear-gradient(transparent_50%,currentColor_50%)] [background-size:100%_4px]"
      />

      <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:gap-6">
        {/* Big magnitude block */}
        <div
          className={cn(
            'flex flex-col items-center justify-center rounded-md border-2 px-5 py-3 md:px-6 md:py-4',
            tier.border,
            tier.bg
          )}
        >
          <span className={cn('font-mono text-5xl md:text-6xl font-bold leading-none tracking-tight', tier.text)}>
            {quake.magnitude.toFixed(1)}
          </span>
          <span className={cn('mt-1 font-mono text-[10px] uppercase tracking-[0.2em]', tier.text)}>
            magnitude
          </span>
        </div>

        {/* Meta */}
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded border px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest',
                tier.border,
                tier.text
              )}
            >
              <span
                aria-hidden="true"
                className={cn('h-1.5 w-1.5 rounded-full animate-pulse', tier.text.replace('text-', 'bg-'))}
              />
              LIVE • {tier.label}
            </span>
            {quake.tsunami && (
              <span
                data-testid="quake-hero-tsunami"
                className="inline-flex items-center gap-1 rounded border border-cyan-500/60 bg-cyan-500/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-cyan-300"
              >
                TSUNAMI
              </span>
            )}
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              {formatTimeAgo(quake.time)}
            </span>
          </div>

          <h3 className="font-mono text-lg md:text-xl font-semibold leading-tight text-foreground truncate">
            {quake.location}
          </h3>

          <div className="flex flex-wrap gap-x-6 gap-y-1 font-mono text-xs text-muted-foreground">
            <span>
              <span className="text-foreground/60">DEPTH:</span>{' '}
              <span className="text-foreground">{quake.depth} km</span>
            </span>
            <span>
              <span className="text-foreground/60">LAT/LON:</span>{' '}
              <span className="text-foreground">
                {quake.latitude.toFixed(2)}°, {quake.longitude.toFixed(2)}°
              </span>
            </span>
          </div>
        </div>
      </div>
    </Wrapper>
  );
}

export { HERO_MIN_MAGNITUDE };
