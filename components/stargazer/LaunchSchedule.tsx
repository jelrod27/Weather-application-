'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { themeTokens } from '@/lib/theme-tokens';
import type { Launch } from '@/lib/stargazer/types';
import { safeExternalUrl } from '@/lib/safe-url';
import { formatDate } from '@/lib/stargazer/format';

interface LaunchScheduleProps {
  launches: Launch[];
}

function ExternalLink({ href, children }: { href: string; children: React.ReactNode }) {
  const safe = safeExternalUrl(href);
  if (!safe) {
    return (
      <span className="inline-flex items-center gap-1 border border-cyan-400/30 px-2 py-1 text-[10px] uppercase tracking-wider text-cyan-400 opacity-50">
        {children}
      </span>
    );
  }
  return (
    <a
      href={safe}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 border border-cyan-400/30 px-2 py-1 text-[10px] uppercase tracking-wider text-cyan-400 hover:bg-cyan-400/10 transition-colors"
    >
      {children} <span aria-hidden>{'\u2197'}</span>
    </a>
  );
}

export default function LaunchSchedule({ launches }: LaunchScheduleProps) {
  const styles = themeTokens.card;
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div
      className={cn(
        'container-primary p-4 font-mono',
        styles
      )}
    >
      <h2 className="border-b border-subtle py-3 mb-3 text-xs font-mono uppercase text-muted-foreground">
        Upcoming Launches
      </h2>

      {!launches || launches.length === 0 ? (
        <p className="text-xs font-mono">
          No upcoming launches scheduled.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-subtle">
                <th className="w-6 px-1 py-1" />
                <th className="px-2 py-1 text-left uppercase tracking-wider text-muted-foreground">
                  Date
                </th>
                <th className="px-2 py-1 text-left uppercase tracking-wider text-muted-foreground">
                  Mission
                </th>
                <th className="px-2 py-1 text-left uppercase tracking-wider text-muted-foreground">
                  Vehicle
                </th>
                <th className="px-2 py-1 text-left uppercase tracking-wider text-muted-foreground">
                  Provider
                </th>
                <th className="px-2 py-1 text-left uppercase tracking-wider text-muted-foreground">
                  Site
                </th>
                <th className="px-2 py-1 text-left uppercase tracking-wider text-muted-foreground">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {launches.map((launch) => {
                const isExpanded = expandedId === launch.id;
                return (
                  <React.Fragment key={launch.id}>
                    <tr
                      className="border-b border-subtle cursor-pointer hover:bg-white/5 transition-colors"
                      onClick={() => setExpandedId(isExpanded ? null : launch.id)}
                    >
                      <td className="px-1 py-1 text-muted-foreground">
                        <span className={cn('inline-block transition-transform', isExpanded && 'rotate-90')}>
                          {'\u25B6'}
                        </span>
                      </td>
                      <td className="px-2 py-1 font-mono">
                        {formatDate(launch.net)}
                      </td>
                      <td className="px-2 py-1 text-cyan-400">
                        <span className="flex items-center gap-1">
                          {launch.missionName || launch.name}
                          {launch.isCrewed && (
                            <span className="bg-yellow-600 px-1 py-0.5 text-[9px] uppercase tracking-wider text-white">
                              Crewed
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="px-2 py-1 font-mono">
                        {launch.vehicle}
                      </td>
                      <td className="px-2 py-1 text-muted-foreground">
                        {launch.provider}
                      </td>
                      <td className="px-2 py-1 text-muted-foreground">
                        {launch.padLocation}
                      </td>
                      <td className="px-2 py-1 font-mono">
                        {launch.status}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan={7} className="px-4 py-3 border-b border-subtle">
                          <div className="border-l-2 border-cyan-400/40 pl-4 space-y-3">
                            {launch.missionDescription && (
                              <p className="text-xs leading-relaxed text-muted-foreground max-w-xl">
                                {launch.missionDescription}
                              </p>
                            )}
                            <div className="flex flex-wrap gap-2">
                              {launch.videoUrls.length > 0 && (
                                <ExternalLink href={launch.videoUrls[0]}>
                                  Watch Live
                                </ExternalLink>
                              )}
                              {launch.padMapUrl && (
                                <ExternalLink href={launch.padMapUrl}>
                                  Launch Site
                                </ExternalLink>
                              )}
                              {launch.slug && (
                                <ExternalLink href={`https://www.spacelaunchnow.me/launch/${launch.slug}`}>
                                  More Info
                                </ExternalLink>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
