'use client';

/**
 * SVG world map showing quake epicenters on Natural Earth continents.
 *
 * - Continents render from a build-time–generated path (no runtime deps,
 *   no tile servers). Graticule sits on top at low opacity for a retro
 *   terminal-screen feel.
 * - Each quake is a dot sized/colored by magnitude; the largest dot gets
 *   a pulsing halo.
 * - M4.5+ dots are clickable. Click opens a small floating info card
 *   anchored near the dot with magnitude, location, time, depth, tsunami
 *   flag, and a USGS link. Dismiss on outside click or Escape.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { formatTimeAgo } from '@/lib/format-time-ago';
import type { ClientEarthquake } from './earth-sciences-client';
import { safeExternalUrl } from '@/lib/safe-url';
import {
  WORLD_LAND_PATH,
  WORLD_MAP_VIEW_W,
  WORLD_MAP_VIEW_H,
} from './world-map-paths';

const INTERACTIVE_MIN_MAGNITUDE = 4.5;

function project(lat: number, lon: number): { x: number; y: number } {
  const x = ((lon + 180) / 360) * WORLD_MAP_VIEW_W;
  const y = ((90 - lat) / 180) * WORLD_MAP_VIEW_H;
  return { x, y };
}

function dotColor(mag: number): string {
  if (mag >= 6) return '#f87171'; // red-400
  if (mag >= 4.5) return '#fb923c'; // orange-400
  return '#facc15'; // yellow-400
}

function dotRadius(mag: number): number {
  return Math.max(2.5, Math.min(mag * 1.4, 14));
}

export interface QuakeWorldMapProps {
  quakes: ClientEarthquake[];
  className?: string;
}

export default function QuakeWorldMap({ quakes, className }: QuakeWorldMapProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sort ascending so larger dots render on top of smaller ones.
  const sorted = useMemo(() => [...quakes].sort((a, b) => a.magnitude - b.magnitude), [quakes]);
  const topId = sorted.length ? sorted[sorted.length - 1].id : null;

  const selected = useMemo(
    () => (selectedId ? quakes.find((q) => q.id === selectedId) ?? null : null),
    [quakes, selectedId],
  );

  // Dismiss popover on outside click and Escape.
  useEffect(() => {
    if (!selectedId) return;
    const onDown = (e: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setSelectedId(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedId(null);
    };
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [selectedId]);

  // If the underlying list changes (filter/refetch) and the selected quake
  // vanishes, close the popover.
  useEffect(() => {
    if (selectedId && !quakes.some((q) => q.id === selectedId)) setSelectedId(null);
  }, [quakes, selectedId]);

  const handleDotActivate = useCallback((q: ClientEarthquake) => {
    if (q.magnitude < INTERACTIVE_MIN_MAGNITUDE) return;
    setSelectedId((prev) => (prev === q.id ? null : q.id));
  }, []);

  // Graticule at 30° intervals.
  const lonLines = [-150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150];
  const latLines = [-60, -30, 0, 30, 60];

  // Anchor popover at the selected quake's projected position, expressed as
  // a percentage of the container so it scales with the responsive SVG.
  const popoverAnchor = useMemo(() => {
    if (!selected) return null;
    const { x, y } = project(selected.latitude, selected.longitude);
    const leftPct = (x / WORLD_MAP_VIEW_W) * 100;
    const topPct = (y / WORLD_MAP_VIEW_H) * 100;
    // Flip horizontally when near the right edge so the card stays in view.
    const flipLeft = leftPct > 65;
    // Flip vertically when near the bottom so it doesn't overflow.
    const flipUp = topPct > 65;
    return { leftPct, topPct, flipLeft, flipUp };
  }, [selected]);

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative overflow-hidden rounded-md border border-border bg-black/30',
        className,
      )}
      data-testid="quake-world-map"
    >
      <svg
        viewBox={`0 0 ${WORLD_MAP_VIEW_W} ${WORLD_MAP_VIEW_H}`}
        className="block h-auto w-full"
        role="img"
        aria-label={`World map showing ${quakes.length} recent earthquake${quakes.length === 1 ? '' : 's'}. Magnitude ${INTERACTIVE_MIN_MAGNITUDE}+ events are clickable.`}
      >
        {/* Continents */}
        <path
          d={WORLD_LAND_PATH}
          fill="currentColor"
          fillOpacity={0.08}
          stroke="currentColor"
          strokeOpacity={0.35}
          strokeWidth={0.5}
          strokeLinejoin="round"
          className="text-foreground"
          aria-hidden="true"
        />

        {/* Graticule */}
        <g
          stroke="currentColor"
          strokeOpacity={0.08}
          strokeWidth={0.5}
          className="text-foreground"
          aria-hidden="true"
        >
          {lonLines.map((lon) => {
            const { x } = project(0, lon);
            return <line key={`lon-${lon}`} x1={x} y1={0} x2={x} y2={WORLD_MAP_VIEW_H} />;
          })}
          {latLines.map((lat) => {
            const { y } = project(lat, 0);
            return <line key={`lat-${lat}`} x1={0} y1={y} x2={WORLD_MAP_VIEW_W} y2={y} />;
          })}
        </g>

        {/* Equator + prime meridian emphasised */}
        <g
          stroke="currentColor"
          strokeOpacity={0.18}
          strokeWidth={0.75}
          className="text-foreground"
          aria-hidden="true"
        >
          <line x1={0} y1={WORLD_MAP_VIEW_H / 2} x2={WORLD_MAP_VIEW_W} y2={WORLD_MAP_VIEW_H / 2} />
          <line x1={WORLD_MAP_VIEW_W / 2} y1={0} x2={WORLD_MAP_VIEW_W / 2} y2={WORLD_MAP_VIEW_H} />
        </g>

        {/* Quake dots */}
        <g>
          {sorted.map((q) => {
            const { x, y } = project(q.latitude, q.longitude);
            const r = dotRadius(q.magnitude);
            const color = dotColor(q.magnitude);
            const isTop = q.id === topId;
            const isInteractive = q.magnitude >= INTERACTIVE_MIN_MAGNITUDE;
            const isSelected = q.id === selectedId;

            return (
              <g key={q.id}>
                {isTop && (
                  <circle cx={x} cy={y} r={r * 2.4} fill={color} fillOpacity={0.15}>
                    <animate
                      attributeName="r"
                      values={`${r * 1.6};${r * 3};${r * 1.6}`}
                      dur="2.4s"
                      repeatCount="indefinite"
                    />
                    <animate
                      attributeName="fill-opacity"
                      values="0.25;0.05;0.25"
                      dur="2.4s"
                      repeatCount="indefinite"
                    />
                  </circle>
                )}
                <circle
                  cx={x}
                  cy={y}
                  r={r}
                  fill={color}
                  fillOpacity={isSelected ? 1 : 0.85}
                  stroke={isSelected ? '#ffffff' : color}
                  strokeWidth={isSelected ? 1.5 : 0.75}
                  data-testid={isInteractive ? 'quake-dot-interactive' : undefined}
                  data-quake-id={q.id}
                  style={isInteractive ? { cursor: 'pointer' } : undefined}
                  onClick={isInteractive ? () => handleDotActivate(q) : undefined}
                  onKeyDown={
                    isInteractive
                      ? (e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleDotActivate(q);
                          }
                        }
                      : undefined
                  }
                  tabIndex={isInteractive ? 0 : undefined}
                  role={isInteractive ? 'button' : undefined}
                  aria-label={
                    isInteractive
                      ? `Magnitude ${q.magnitude.toFixed(1)} earthquake near ${q.location}. Click for details.`
                      : undefined
                  }
                />
              </g>
            );
          })}
        </g>
      </svg>

      {/* Legend */}
      <div className="absolute bottom-2 right-2 flex items-center gap-3 rounded bg-black/50 px-2 py-1 font-mono text-[9px] uppercase tracking-widest backdrop-blur-sm">
        <span className="flex items-center gap-1 text-yellow-400">
          <span className="h-2 w-2 rounded-full bg-yellow-400" /> M2.5+
        </span>
        <span className="flex items-center gap-1 text-orange-400">
          <span className="h-2.5 w-2.5 rounded-full bg-orange-400" /> M4.5+
        </span>
        <span className="flex items-center gap-1 text-red-400">
          <span className="h-3 w-3 rounded-full bg-red-400" /> M6+
        </span>
      </div>

      {/* Info popover for the selected quake */}
      {selected && popoverAnchor && (
        <div
          role="dialog"
          aria-label={`Details for magnitude ${selected.magnitude.toFixed(1)} earthquake`}
          data-testid="quake-popover"
          className={cn(
            'absolute z-10 w-60 rounded-md border border-border bg-background/95 p-3 font-mono text-xs shadow-lg backdrop-blur-sm',
            'transition-opacity',
          )}
          style={{
            left: popoverAnchor.flipLeft ? undefined : `${popoverAnchor.leftPct}%`,
            right: popoverAnchor.flipLeft ? `${100 - popoverAnchor.leftPct}%` : undefined,
            top: popoverAnchor.flipUp ? undefined : `${popoverAnchor.topPct}%`,
            bottom: popoverAnchor.flipUp ? `${100 - popoverAnchor.topPct}%` : undefined,
            transform: `translate(${popoverAnchor.flipLeft ? '-8px' : '8px'}, ${
              popoverAnchor.flipUp ? '-8px' : '8px'
            })`,
          }}
        >
          <div className="flex items-start justify-between gap-2">
            <span
              className="inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] uppercase tracking-widest"
              style={{ color: dotColor(selected.magnitude), borderColor: dotColor(selected.magnitude) }}
            >
              M{selected.magnitude.toFixed(1)}
            </span>
            <button
              type="button"
              onClick={() => setSelectedId(null)}
              aria-label="Close details"
              className="text-muted-foreground hover:text-foreground"
            >
              ×
            </button>
          </div>
          <h4 className="mt-2 text-sm font-semibold leading-tight text-foreground break-words">
            {selected.location}
          </h4>
          <dl className="mt-2 space-y-1 text-muted-foreground">
            <div className="flex justify-between gap-2">
              <dt>Time</dt>
              <dd className="text-foreground">{formatTimeAgo(selected.time)}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt>Depth</dt>
              <dd className="text-foreground">{selected.depth} km</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt>Coords</dt>
              <dd className="text-foreground">
                {selected.latitude.toFixed(2)}°, {selected.longitude.toFixed(2)}°
              </dd>
            </div>
            {selected.tsunami && (
              <div className="flex justify-between gap-2">
                <dt>Tsunami</dt>
                <dd className="text-cyan-300">FLAGGED</dd>
              </div>
            )}
          </dl>
          {(() => {
            const safe = safeExternalUrl(selected.url);
            return safe ? (
              <a
                href={safe}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1 text-[10px] uppercase tracking-widest text-primary hover:underline"
              >
                USGS details →
              </a>
            ) : null;
          })()}
        </div>
      )}
    </div>
  );
}
