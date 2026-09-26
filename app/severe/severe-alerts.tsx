'use client';

/**
 * 16-Bit Weather Platform - Severe Alerts Panel
 *
 * Client-only leaf: polls /api/weather/alerts every 5 min and renders the
 * filtered severe alert list. Sibling to the SPC outlook map in the parent
 * server page.
 */
import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { getWarningDetailHref } from '@/lib/warnings/alert-links';
import { cn } from '@/lib/utils';
import type { NWSAlert } from '@/lib/services/nws-alerts-service';

const SEVERE_KEYWORDS = ['tornado', 'thunderstorm', 'wind', 'hail', 'flood'];
const SEVERITY_ORDER: Record<string, number> = { Extreme: 0, Severe: 1, Moderate: 2, Minor: 3 };

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

export default function SevereAlerts() {
  const [alerts, setAlerts] = useState<NWSAlert[]>([]);
  const [unavailable, setUnavailable] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async (showLoading = false) => {
    if (showLoading) setIsLoading(true);
    try {
      const res = await fetch('/api/weather/alerts');
      if (!res.ok) {
        throw new Error(`Severe alerts unavailable: ${res.status}`);
      }
      const data = await res.json();
      const filtered = (data.alerts ?? []).filter((a: NWSAlert) =>
        SEVERE_KEYWORDS.some(kw => a.event.toLowerCase().includes(kw))
      );
      filtered.sort((a: NWSAlert, b: NWSAlert) =>
        (SEVERITY_ORDER[a.severity] ?? 4) - (SEVERITY_ORDER[b.severity] ?? 4)
      );
      setAlerts(filtered);
      setUnavailable(false);
    } catch (e) {
      console.error('[Severe]', e);
      setUnavailable(true);
      setAlerts([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const i = setInterval(fetchData, 300000);
    return () => clearInterval(i);
  }, [fetchData]);

  if (isLoading) {
    return (
      <p className="text-center text-lg font-mono text-muted-foreground animate-pulse py-12">
        SCANNING FOR SEVERE WEATHER...
      </p>
    );
  }

  if (unavailable) {
    return <div role="status" className="text-center font-mono text-muted-foreground py-12 space-y-3">
      <p>Alert status unavailable.</p>
      <button type="button" className="underline mr-4" onClick={() => void fetchData(true)}>Retry severe alerts</button>
      <a href="https://www.weather.gov/" target="_blank" rel="noopener noreferrer" className="underline">Check official NWS information</a>
    </div>;
  }

  if (alerts.length === 0) {
    return (
      <div className="text-center py-12 border border-border rounded-lg bg-card/30">
        <p className="text-lg font-mono text-green-400 font-bold">NO MATCHING NWS ALERTS</p>
        <p className="text-sm font-mono text-muted-foreground mt-2">No current US severe weather alerts returned by this feed.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold font-mono tracking-wider uppercase">Active Severe Alerts</h2>
        <span className="text-xs font-mono text-muted-foreground">{alerts.length} active</span>
      </div>
      <div className="grid gap-3">
        {alerts.map((alert, i) => (
          <Link href={getWarningDetailHref(alert.id, '/severe')} key={alert.id || i} className="block border border-border rounded-lg p-4 bg-card/50 hover:bg-card/80 transition-colors">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-mono text-muted-foreground w-8">#{String(i + 1).padStart(2, '0')}</span>
                <span className={cn('px-2 py-0.5 rounded text-xs font-mono font-bold border', severityBadge[alert.severity])}>
                  {alert.severity.toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-mono font-bold text-sm truncate">{alert.event}</p>
                <p className="text-xs font-mono text-muted-foreground truncate">{alert.areaDesc}</p>
              </div>
              {alert.expires && (
                <span className="text-xs font-mono text-muted-foreground shrink-0">{getTimeRemaining(alert.expires)}</span>
              )}
            </div>
            {alert.headline && (
              <p className="mt-2 text-xs font-mono text-muted-foreground line-clamp-2">{alert.headline}</p>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
