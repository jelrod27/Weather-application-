'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { formatTurbulenceAltitude, selectTurbulenceAdvisories } from '@/lib/aviation/turbulence';
import type { TurbulenceData } from '@/lib/aviation/turbulence';

const AdvisoryMap = dynamic(() => import('./AdvisoryMap'), { ssr: false,
  loading: () => <div className="flex h-[360px] items-center justify-center rounded-lg bg-muted sm:h-[480px]" role="status">Loading map…</div> });
const CONTROL = 'min-h-11 rounded-lg border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary';

function utc(value: string | null): string {
  if (!value) return 'Not reported';
  return new Date(value).toLocaleString('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: false }) + ' UTC';
}

export default function TurbulenceOutlook(): React.JSX.Element {
  const [data, setData] = useState<TurbulenceData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [time, setTime] = useState('');
  const [altitude, setAltitude] = useState('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [searchStatus, setSearchStatus] = useState('');
  const [searching, setSearching] = useState(false);
  const [center, setCenter] = useState<[number, number] | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const searchAbort = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    fetch('/api/aviation/turbulence', { signal: controller.signal })
      .then(async response => {
        const body = await response.json();
        if (!response.ok || !body.success || !Array.isArray(body.data?.polygons)) throw new Error('Unavailable');
        if (!controller.signal.aborted) { setData(body.data); setNow(Date.now()); }
      })
      .catch(() => { if (!controller.signal.aborted) { setData(null); setError('Advisories are unavailable. Try refreshing, or check NOAA directly.'); } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [refresh]);

  useEffect(() => {
    const clock = setInterval(() => setNow(Date.now()), 60_000);
    const poll = setInterval(() => setRefresh(value => value + 1), 300_000);
    return () => { clearInterval(clock); clearInterval(poll); searchAbort.current?.abort(); };
  }, []);

  const expired = Boolean(data?.polygons.length && data.polygons.every(polygon => Date.parse(polygon.validTo) <= now));
  const stale = Boolean(data && (data.status === 'stale' || expired || now - Date.parse(data.fetchedAt) > 15 * 60_000));
  const times = useMemo(() => [...new Set((data?.polygons ?? []).filter(polygon => Date.parse(polygon.validTo) > now)
    .map(polygon => polygon.validFrom))].sort(), [data, now]);
  const selectedTime = times.includes(time) ? time : times.find(value => Date.parse(value) >= now) ?? times.at(-1) ?? '';
  const polygons = useMemo(() => stale ? [] : selectTurbulenceAdvisories(data?.polygons ?? [], selectedTime,
    altitude === 'all' ? null : Number(altitude), now), [data, selectedTime, altitude, now, stale]);
  const selectArea = useCallback((id: string | null) => setSelectedId(id), []);
  const visibleSelectedId = polygons.some(polygon => polygon.id === selectedId) ? selectedId : null;

  async function search(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    searchAbort.current?.abort();
    const controller = new AbortController();
    searchAbort.current = controller;
    setSearching(true); setSearchStatus('');
    try {
      const response = await fetch(`/api/weather/geocoding?q=${encodeURIComponent(query.trim())}&limit=1`, { signal: controller.signal });
      const results = await response.json();
      if (!response.ok || !Array.isArray(results) || !results[0]) throw new Error();
      const place = results[0];
      if (typeof place.lat !== 'number' || typeof place.lon !== 'number') throw new Error();
      if (controller.signal.aborted) return;
      setCenter([place.lon, place.lat]); setSelectedId(null);
      setSearchStatus(`Map centered on ${place.name}. Coverage remains contiguous US only; the list shows all areas for the selected snapshot.`);
    } catch {
      if (!controller.signal.aborted) setSearchStatus('Location not found or search unavailable. Try a city and state.');
    } finally { if (!controller.signal.aborted) setSearching(false); }
  }

  return <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:py-8">
    <header className="space-y-3">
      <Link href="/travel" className="text-sm text-primary underline underline-offset-4">← Travel Hub</Link>
      <p className="font-mono text-xs uppercase tracking-widest text-primary">Weather for your journey</p>
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">US turbulence advisory map</h1>
      <p className="max-w-3xl text-muted-foreground">Explore NOAA advisories at published times and altitude layers. No flight number or trip details needed.</p>
    </header>
    <aside className="rounded-lg border border-border bg-muted/50 p-4 text-sm leading-relaxed" aria-label="Coverage and interpretation">
      <strong>Contiguous US and adjacent coastal waters.</strong> Canada, Mexico, Alaska and Hawaii are not covered by this feed.
      {' '}These are advisories for moderate, non-convective turbulence—not a complete turbulence forecast. No advisory does not mean a smooth flight.
    </aside>
    <section aria-label="Explore advisories" className="space-y-4 rounded-xl border border-border bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-0 flex-col gap-1 text-sm">Advisory snapshot (UTC)
          <select className={CONTROL} value={selectedTime} disabled={!times.length || stale} onChange={event => { setTime(event.target.value); setSelectedId(null); }}>
            {!times.length && <option value="">No published snapshots available</option>}
            {times.map(value => <option key={value} value={value}>{utc(value)}{Date.parse(value) < now ? ' · past snapshot' : ''}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">Altitude
          <select className={CONTROL} value={altitude} onChange={event => { setAltitude(event.target.value); setSelectedId(null); }}>
            <option value="all">All reported layers</option>
            {[5000, 10000, 18000, 24000, 30000, 35000, 40000].map(value => <option key={value} value={value}>{formatTurbulenceAltitude(value)}</option>)}
          </select>
        </label>
        <button className={CONTROL} disabled={loading} onClick={() => setRefresh(value => value + 1)}>{loading ? 'Refreshing…' : 'Refresh advisories'}</button>
        <button className={CONTROL} onClick={() => { setCenter(null); setSelectedId(null); setResetKey(value => value + 1); setSearchStatus(''); }}>Reset US view</button>
      </div>
      <form onSubmit={search} className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-sm">Find a city
          <input className={CONTROL} value={query} maxLength={120} placeholder="City and state" onChange={event => { searchAbort.current?.abort(); setSearching(false); setQuery(event.target.value); setSearchStatus(''); }} />
        </label>
        <button className={CONTROL} disabled={searching || query.trim().length < 2}>{searching ? 'Finding…' : 'Center map'}</button>
      </form>
      {searchStatus && <p role="status" className="text-sm text-muted-foreground">{searchStatus}</p>}
      <div aria-live="polite" className="text-sm">
        {loading && !data && <p>Loading NOAA advisories…</p>}
        {error && <p role="alert">{error}</p>}
        {stale && <p role="alert">The available data is stale or expired. Areas are hidden until refreshed.</p>}
        {data?.status === 'partial' && <p role="status">Some advisory data is unavailable. Missing snapshots or areas are unknown, not clear.</p>}
        {data && <p className="text-muted-foreground">NOAA AWC G-AIRMET · Retrieved {utc(data.fetchedAt)} · Checks every 5 minutes.</p>}
      </div>
      <AdvisoryMap polygons={polygons} selectedId={visibleSelectedId} onSelect={selectArea} center={center} resetKey={resetKey} />
    </section>
    <section aria-labelledby="advisory-list-heading" className="space-y-3">
      <h2 id="advisory-list-heading" className="text-xl font-semibold">Advisory details · {polygons.length} areas</h2>
      <p className="text-sm text-muted-foreground">All areas for the selected snapshot and altitude, including those outside the current map view. Select an area to locate it on the map. Unknown altitude layers appear only under “All reported layers.”</p>
      {!loading && data && data.status !== 'partial' && !stale && !polygons.length && <p className="rounded-lg border border-border p-4">No matching turbulence advisories were returned. This does not establish smooth conditions.</p>}
      <ol className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {polygons.map((polygon, index) => <li key={polygon.id} className="rounded-lg border border-border bg-card p-4">
          <button aria-pressed={visibleSelectedId === polygon.id} onClick={() => selectArea(polygon.id)} className="text-left font-semibold text-primary underline underline-offset-4 focus-visible:ring-2 focus-visible:ring-primary">
            Area {index + 1} · {polygon.rawSeverity || 'Intensity not reported'}
          </button>
          <p className="mt-2 text-sm">{formatTurbulenceAltitude(polygon.baseFt)} – {formatTurbulenceAltitude(polygon.topFt)}</p>
          <p className="text-sm text-muted-foreground">Snapshot: {utc(polygon.validFrom)}</p>
          <p className="text-xs text-muted-foreground">Issued: {utc(polygon.issuedAt)} · Product expires: {utc(polygon.validTo)}</p>
          <p className="mt-1 text-xs text-muted-foreground">Area reference: {polygon.coordinates[0][0][1].toFixed(1)}° latitude, {polygon.coordinates[0][0][0].toFixed(1)}° longitude</p>
        </li>)}
      </ol>
    </section>
    <section className="space-y-2 border-t border-border pt-5 text-sm leading-relaxed" aria-labelledby="read-map-heading">
      <h2 id="read-map-heading" className="text-lg font-semibold">How to read this map</h2>
      <p>MOD means moderate turbulence in the reported layer. G-AIRMET snapshots are issued at three-hour steps, up to 12 hours from their forecast package. Product expiry is separate from a snapshot time; it does not define continuous coverage between snapshots.</p>
      <p>Thunderstorm turbulence, pilot observations and global model guidance are not layers in this first release. <Link href="/aviation" className="text-primary underline">View pilot reports and other aviation hazards</Link>.</p>
      <p>General weather information, not a forecast for a specific aircraft or flight and not for operational flight planning. Conditions and routes can change. Follow airline crew instructions and official guidance.</p>
      <a href="https://aviationweather.gov/gfa/#gairmet" className="inline-block text-primary underline">Source: NOAA Aviation Weather Center →</a>
    </section>
  </div>;
}
