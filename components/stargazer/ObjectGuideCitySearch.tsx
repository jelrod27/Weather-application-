'use client';

import { useEffect, useRef, useState } from 'react';
import { isStargazerTimeZone, parseStargazerCoordinates } from '@/lib/stargazer/context';
import type { FormEvent, ReactNode } from 'react';
import type { StargazerCoordinates } from '@/lib/stargazer/context';
import type { GeocodingResponse } from '@/lib/weather';

interface ObservingCity {
  coordinates: StargazerCoordinates;
  label: string;
  timeZone?: string;
}

interface ObjectGuideCitySearchProps {
  initialLabel: string;
  onSelect: (city: ObservingCity) => void;
}

type SearchState = { status: 'loading' } | { status: 'message'; message: string } | { status: 'results'; cities: ObservingCity[] };

export default function ObjectGuideCitySearch({ initialLabel, onSelect }: ObjectGuideCitySearchProps): ReactNode {
  const [query, setQuery] = useState(initialLabel);
  const [search, setSearch] = useState<SearchState | null>(null);
  const pending = useRef<AbortController | null>(null);

  useEffect(() => () => pending.current?.abort(), []);

  async function searchCities(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const label = query.trim();
    if (!label) return;

    pending.current?.abort();
    const controller = new AbortController();
    pending.current = controller;
    setSearch({ status: 'loading' });

    try {
      const params = new URLSearchParams({ q: label, limit: '5' });
      const response = await fetch(`/api/weather/geocoding?${params}`, {
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]),
      });
      if (!response.ok && response.status !== 404) throw new Error('City lookup failed');
      const matches: GeocodingResponse[] = response.ok ? await response.json() : [];
      if (controller.signal.aborted) return;

      const cities = matches.flatMap(match => {
        const coordinates = parseStargazerCoordinates(String(match.lat), String(match.lon));
        if (!coordinates || !match.name) return [];
        const label = [...new Set([match.name, match.state, match.country].filter(Boolean))].join(', ');
        const timeZone = isStargazerTimeZone(match.timezone) ? match.timezone : undefined;
        return [{ coordinates, label, timeZone }];
      });
      setSearch(cities.length ? { status: 'results', cities }
        : { status: 'message', message: 'No cities found. Try adding a state or country.' });
    } catch {
      if (controller.signal.aborted) return;
      setSearch({ status: 'message', message: 'City search is unavailable right now. Please try again.' });
    }
  }

  const isSearching = search?.status === 'loading';
  return <div className="space-y-2">
    <form onSubmit={searchCities} className="flex max-w-lg flex-wrap items-end gap-2">
      <label className="flex min-w-36 flex-1 flex-col gap-1 text-sm">
        Observing city
        <input type="search" value={query} maxLength={200} placeholder="City, state or country"
          className="w-full rounded border border-border bg-background px-3 py-2"
          onChange={event => {
            pending.current?.abort();
            setQuery(event.target.value);
            setSearch(null);
          }} />
      </label>
      <button type="submit" disabled={isSearching || !query.trim()}
        className="rounded border border-border px-4 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-50">Search</button>
    </form>
    <p role="status" className="text-sm">
      {isSearching && 'Searching for cities…'}
      {search?.status === 'message' && search.message}
      {search?.status === 'results' && 'Select the city you’ll be observing from.'}
    </p>
    {search?.status === 'results' && <ul className="space-y-1">
      {search.cities.map(city => <li key={`${city.label}:${city.coordinates.lat},${city.coordinates.lon}`}>
        <button type="button" className="rounded border border-border px-3 py-2 text-left text-sm text-primary hover:bg-muted"
          onClick={() => onSelect(city)}>{city.label}</button>
      </li>)}
    </ul>}
  </div>;
}
