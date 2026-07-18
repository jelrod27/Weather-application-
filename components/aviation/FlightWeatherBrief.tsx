'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

type BriefResponse = {
  level: 'low' | 'watch' | 'elevated';
  summary: string;
  score: number;
  origin: { iata: string; category: string; metar: string | null };
  destination: { iata: string; category: string; metar: string | null };
  drivers: Array<{ id: string; title: string; detail: string }>;
  hazards: Array<{ id: string; type: string; hazard: string; severity: string }>;
  validUntil: string;
  disclaimer: string;
  error?: string;
};

export type FlightWeatherBriefProps = {
  origin: string | null;
  destination: string | null;
  className?: string;
};

const LEVEL_STYLES: Record<BriefResponse['level'], string> = {
  low: 'border-green-500/50 bg-green-500/10 text-green-300',
  watch: 'border-yellow-500/50 bg-yellow-500/10 text-yellow-200',
  elevated: 'border-orange-500/50 bg-orange-500/10 text-orange-200',
};

export default function FlightWeatherBrief({
  origin,
  destination,
  className,
}: FlightWeatherBriefProps) {
  const [brief, setBrief] = useState<BriefResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manualOrigin, setManualOrigin] = useState('');
  const [manualDest, setManualDest] = useState('');

  const effectiveOrigin = origin ?? manualOrigin.trim().toUpperCase();
  const effectiveDest = destination ?? manualDest.trim().toUpperCase();

  useEffect(() => {
    if (!effectiveOrigin || !effectiveDest) {
      setBrief(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({
      origin: effectiveOrigin,
      dest: effectiveDest,
    });
    void fetch(`/api/aviation/flight-brief?${params}`)
      .then(async (res) => {
        const data = (await res.json()) as BriefResponse;
        if (cancelled) return;
        if (!res.ok) {
          setError(data.error ?? 'Brief unavailable');
          setBrief(null);
          return;
        }
        setBrief(data);
      })
      .catch((err) => {
        console.error('[FlightWeatherBrief]', err);
        if (!cancelled) setError('Brief unavailable');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [effectiveOrigin, effectiveDest]);

  return (
    <section
      className={cn('rounded-lg border border-border bg-card/60 p-4 font-mono', className)}
      data-testid="flight-weather-brief"
    >
      <h3 className="mb-2 text-sm font-bold uppercase tracking-wider text-primary">
        Flight Weather Brief
      </h3>

      {(!origin || !destination) && (
        <div className="mb-3 grid grid-cols-2 gap-2">
          <input
            value={manualOrigin}
            onChange={(e) => setManualOrigin(e.target.value)}
            placeholder="Origin (ATL)"
            className="rounded border border-border bg-background px-2 py-1 text-xs"
            aria-label="Manual origin airport"
          />
          <input
            value={manualDest}
            onChange={(e) => setManualDest(e.target.value)}
            placeholder="Dest (DEN)"
            className="rounded border border-border bg-background px-2 py-1 text-xs"
            aria-label="Manual destination airport"
          />
        </div>
      )}

      {loading && <p className="text-xs text-muted-foreground">Scoring route weather…</p>}
      {error && <p className="text-xs text-orange-300">{error}</p>}

      {brief && (
        <div className="space-y-3">
          <div className={cn('rounded border px-3 py-2', LEVEL_STYLES[brief.level])}>
            <p className="text-xs uppercase tracking-widest">{brief.level}</p>
            <p className="text-sm">{brief.summary}</p>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded border border-border/60 p-2">
              <div className="text-muted-foreground">Origin {brief.origin.iata}</div>
              <div className="font-bold">{brief.origin.category}</div>
            </div>
            <div className="rounded border border-border/60 p-2">
              <div className="text-muted-foreground">Dest {brief.destination.iata}</div>
              <div className="font-bold">{brief.destination.category}</div>
            </div>
          </div>

          <ul className="space-y-1 text-xs">
            {brief.drivers.map((d) => (
              <li key={d.id} className="rounded border border-border/40 px-2 py-1">
                <div className="font-semibold">{d.title}</div>
                <div className="text-muted-foreground">{d.detail}</div>
              </li>
            ))}
          </ul>

          <p className="text-[10px] text-muted-foreground">{brief.disclaimer}</p>
        </div>
      )}

      {!loading && !brief && !error && (
        <p className="text-xs text-muted-foreground">
          Select an aircraft with a known route, or enter origin/destination airports.
        </p>
      )}
    </section>
  );
}
