'use client';

import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Aircraft } from '@/lib/aviation/aircraft-types';

type RouteInfo = {
  origin: string | null;
  destination: string | null;
};

type PhotoInfo = {
  thumbnail?: string;
  link?: string;
};

export type AircraftSelectionPanelProps = {
  aircraft: Aircraft;
  trail: Array<{ lat: number; lon: number; at: number }>;
  onClose: () => void;
  onRouteResolved?: (route: RouteInfo) => void;
  className?: string;
};

export default function AircraftSelectionPanel({
  aircraft,
  trail,
  onClose,
  onRouteResolved,
  className,
}: AircraftSelectionPanelProps) {
  const [route, setRoute] = useState<RouteInfo | null>(null);
  const [photo, setPhoto] = useState<PhotoInfo | null>(null);

  useEffect(() => {
    let cancelled = false;
    setRoute(null);
    setPhoto(null);

    const callsign = aircraft.callsign;
    if (callsign) {
      const params = new URLSearchParams({
        callsign,
        lat: String(aircraft.lat),
        lon: String(aircraft.lon),
      });
      void fetch(`/api/aviation/aircraft/route?${params}`)
        .then((r) => r.json())
        .then((data: RouteInfo & { error?: string }) => {
          if (cancelled) return;
          const next = { origin: data.origin ?? null, destination: data.destination ?? null };
          setRoute(next);
          onRouteResolved?.(next);
        })
        .catch(() => {
          if (!cancelled) setRoute({ origin: null, destination: null });
        });
    }

    void fetch(`/api/aviation/aircraft/photo?hex=${encodeURIComponent(aircraft.icao24)}`)
      .then((r) => r.json())
      .then((data: { photos?: Array<{ thumbnail?: { src?: string }; link?: string }> }) => {
        if (cancelled) return;
        const first = data.photos?.[0];
        setPhoto({
          thumbnail: first?.thumbnail?.src,
          link: first?.link,
        });
      })
      .catch(() => {
        if (!cancelled) setPhoto(null);
      });

    return () => {
      cancelled = true;
    };
  }, [aircraft.icao24, aircraft.callsign, aircraft.lat, aircraft.lon, onRouteResolved]);

  const stats = useMemo(
    () => [
      { label: 'Alt', value: aircraft.altitudeFt != null ? `${aircraft.altitudeFt.toLocaleString()} ft` : '—' },
      { label: 'GS', value: aircraft.groundSpeedKt != null ? `${Math.round(aircraft.groundSpeedKt)} kt` : '—' },
      { label: 'Track', value: aircraft.trackDeg != null ? `${Math.round(aircraft.trackDeg)}°` : '—' },
      { label: 'VS', value: aircraft.verticalRateFpm != null ? `${Math.round(aircraft.verticalRateFpm)} fpm` : '—' },
      { label: 'Squawk', value: aircraft.squawk ?? '—' },
      { label: 'Type', value: aircraft.typeCode ?? '—' },
    ],
    [aircraft],
  );

  return (
    <aside
      className={cn(
        'flex h-full flex-col border border-border bg-card/95 font-mono text-sm shadow-lg backdrop-blur',
        className,
      )}
      data-testid="aircraft-selection-panel"
      aria-label="Selected aircraft"
    >
      <div className="flex items-start justify-between gap-2 border-b border-border p-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Selected</p>
          <h3 className="text-lg font-bold text-foreground">
            {aircraft.callsign ?? aircraft.icao24.toUpperCase()}
          </h3>
          <p className="text-xs text-muted-foreground">
            {aircraft.registration ?? '—'} · {aircraft.icao24.toUpperCase()} · {aircraft.source}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded border border-border p-1 text-muted-foreground hover:text-foreground"
          aria-label="Close selection"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 p-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded border border-border/60 bg-background/40 px-2 py-1">
            <div className="text-[10px] uppercase text-muted-foreground">{s.label}</div>
            <div className="font-semibold">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="border-t border-border px-3 py-2">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Route</p>
        <p className="font-semibold">
          {route?.origin || route?.destination
            ? `${route?.origin ?? '???'} → ${route?.destination ?? '???'}`
            : 'Route unknown'}
        </p>
        <p className="mt-1 text-[10px] text-muted-foreground">Trail points: {trail.length}</p>
      </div>

      {photo?.thumbnail && (
        <div className="border-t border-border p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photo.thumbnail}
            alt={aircraft.callsign ? `${aircraft.callsign} aircraft` : 'Aircraft'}
            className="h-28 w-full rounded object-cover"
          />
          {photo.link && (
            <a
              href={photo.link}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 block text-[10px] text-primary underline"
            >
              Photo via Planespotters
            </a>
          )}
        </div>
      )}
    </aside>
  );
}
