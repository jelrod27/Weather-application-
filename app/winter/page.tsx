'use client';

/**
 * 16-Bit Weather Platform - Winter Weather Page
 *
 * Filtered view of NWS alerts for winter storms, blizzards,
 * ice, snow, and freeze warnings.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import PageWrapper from '@/components/page-wrapper';
import type { NWSAlert } from '@/lib/services/nws-alerts-service';

const WINTER_KEYWORDS = ['winter', 'snow', 'ice', 'blizzard', 'freeze', 'cold', 'wind chill', 'frost'];

const severityBadge: Record<string, string> = {
  Extreme: 'bg-red-500/20 text-red-400 border-red-500/50',
  Severe: 'bg-orange-500/20 text-orange-400 border-orange-500/50',
  Moderate: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
  Minor: 'bg-blue-500/20 text-blue-400 border-blue-500/50',
};

function getTimeRemaining(expires: string): string {
  const diff = new Date(expires).getTime() - Date.now();
  if (diff <= 0) return 'EXPIRED';
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return h > 0 ? `${h}h ${m}m left` : `${m}m left`;
}

export default function WinterPage() {
  const [alerts, setAlerts] = useState<NWSAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/weather/alerts');
      if (!res.ok) return;
      const data = await res.json();
      const filtered = (data.alerts ?? []).filter((a: NWSAlert) =>
        WINTER_KEYWORDS.some(kw => a.event.toLowerCase().includes(kw))
      );
      filtered.sort((a: NWSAlert, b: NWSAlert) => {
        const order: Record<string, number> = { Extreme: 0, Severe: 1, Moderate: 2, Minor: 3 };
        return (order[a.severity] ?? 4) - (order[b.severity] ?? 4);
      });
      setAlerts(filtered);
    } catch (e) { console.error('[Winter]', e); }
    finally { setIsLoading(false); }
  }, []);

  useEffect(() => { fetchData(); const i = setInterval(fetchData, 300000); return () => clearInterval(i); }, [fetchData]);

  return (
    <PageWrapper>
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight font-mono uppercase">Winter Weather</h1>
          <p className="text-sm font-mono text-muted-foreground tracking-wider">// WINTER STORM, BLIZZARD, ICE &amp; SNOW WARNINGS</p>
        </div>

        {isLoading && <p className="text-center text-lg font-mono text-muted-foreground animate-pulse py-12">SCANNING FOR WINTER WEATHER...</p>}

        {!isLoading && alerts.length === 0 && (
          <div className="text-center py-12 border border-border rounded-lg bg-card/30">
            <p className="text-lg font-mono text-blue-400 font-bold">NO WINTER ALERTS</p>
            <p className="text-sm font-mono text-muted-foreground mt-2">No active winter weather advisories across the United States</p>
          </div>
        )}

        {!isLoading && alerts.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold font-mono tracking-wider uppercase">Active Winter Alerts</h2>
              <span className="text-xs font-mono text-muted-foreground">{alerts.length} active</span>
            </div>
            <div className="grid gap-3">
              {alerts.map((alert, i) => (
                <div key={alert.id || i} className="border border-border rounded-lg p-4 bg-card/50 hover:bg-card/80 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-mono text-muted-foreground w-8">#{String(i + 1).padStart(2, '0')}</span>
                      <span className={cn('px-2 py-0.5 rounded text-xs font-mono font-bold border', severityBadge[alert.severity])}>{alert.severity.toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-mono font-bold text-sm truncate">{alert.event}</p>
                      <p className="text-xs font-mono text-muted-foreground truncate">{alert.areaDesc}</p>
                    </div>
                    {alert.expires && <span className="text-xs font-mono text-muted-foreground shrink-0">{getTimeRemaining(alert.expires)}</span>}
                  </div>
                  {alert.headline && <p className="mt-2 text-xs font-mono text-muted-foreground line-clamp-2">{alert.headline}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
