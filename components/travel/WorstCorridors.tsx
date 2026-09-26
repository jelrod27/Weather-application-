'use client';

/**
 * Worst Corridors Component
 *
 * Displays ranked list of top 5 worst driving corridors.
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { CORRIDOR_LEVEL_LABEL, formatCorridorSample } from '@/lib/services/travel-corridor-service';
import type { CorridorResult, CorridorLevel } from '@/lib/services/travel-corridor-service';

interface WorstCorridorsProps {
  corridors: CorridorResult[];
  isLoading: boolean;
}

const LEVEL_BADGE: Record<CorridorLevel, string> = {
  unknown: 'bg-gray-500/20 text-muted-foreground border-border',
  green: 'bg-green-500/20 text-green-400 border-green-500/50',
  yellow: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
  orange: 'bg-orange-500/20 text-orange-400 border-orange-500/50',
  red: 'bg-red-500/20 text-red-400 border-red-500/50',
};

export default function WorstCorridors({ corridors, isLoading }: WorstCorridorsProps) {
  if (isLoading) {
    return (
      <div className="border border-border rounded-lg p-6 bg-card/30">
        <p className="text-sm font-mono text-muted-foreground animate-pulse text-center">ANALYZING CORRIDORS...</p>
      </div>
    );
  }

  if (corridors.length === 0) {
    return (
      <div className="border border-border rounded-lg p-6 bg-card/30 text-center">
        <p className="text-lg font-mono text-muted-foreground font-bold">CONDITIONS UNAVAILABLE</p>
        <p className="text-sm font-mono text-muted-foreground mt-1">No corridor readings are available. Try again later.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold font-mono tracking-wider uppercase">Corridor Conditions</h2>
        <span className="text-xs font-mono text-muted-foreground">{corridors.length} shown · ranked by worst sample</span>
      </div>
      <div className="grid gap-2">
        {corridors.map((corridor, i) => (
          <div key={corridor.name} className="border border-border rounded-lg p-4 bg-card/50 hover:bg-card/80 transition-colors">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-mono text-muted-foreground w-8">#{i + 1}</span>
              <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: corridor.color }} />
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono font-bold text-sm">{corridor.name}</span>
                  <span className={cn('px-2 py-0.5 rounded text-xs font-mono font-bold border', LEVEL_BADGE[corridor.level])}>
                    {CORRIDOR_LEVEL_LABEL[corridor.level]}
                  </span>
                </div>
                <p className="text-xs font-mono text-muted-foreground mt-1">{corridor.hazard}</p>
                {corridor.worstPoint && <>
                  <p className="text-xs font-mono text-muted-foreground">Worst sample: {corridor.worstPoint.score}/100</p>
                  <p className="text-xs font-mono text-muted-foreground">{formatCorridorSample(corridor.worstPoint)}</p>
                </>}
                <p className="text-xs font-mono text-muted-foreground">Coverage: {corridor.coverage.available} of {corridor.coverage.total} points{corridor.coverage.available < corridor.coverage.total ? ' · Conditions elsewhere unknown' : ''}</p>
              </div>
              <span className="text-xs font-mono text-muted-foreground shrink-0">Route average: {corridor.score < 0 ? 'Unavailable' : `${corridor.score}/100`}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
