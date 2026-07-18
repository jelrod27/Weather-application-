'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Aircraft } from '@/lib/aviation/aircraft-types';

export type AircraftSearchProps = {
  onFound: (aircraft: Aircraft) => void;
  onError?: (message: string) => void;
  className?: string;
  initialQuery?: string;
};

export default function AircraftSearch({
  onFound,
  onError,
  className,
  initialQuery = '',
}: AircraftSearchProps) {
  const [query, setQuery] = useState(initialQuery);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim().toUpperCase();
    if (!q) {
      onError?.('Enter a callsign or flight ident (e.g. UAL2096)');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/aviation/aircraft/callsign?q=${encodeURIComponent(q)}`);
      const data = (await res.json()) as { aircraft?: Aircraft[]; error?: string };
      if (!res.ok) {
        onError?.(data.error ?? 'Search failed');
        return;
      }
      const hit = data.aircraft?.[0];
      if (!hit) {
        onError?.(`No live aircraft found for ${q}`);
        return;
      }
      onFound(hit);
    } catch (err) {
      console.error('[AircraftSearch]', err);
      onError?.('Search failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      className={cn('flex flex-col gap-2 sm:flex-row sm:items-center', className)}
      data-testid="aircraft-search"
    >
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search callsign (e.g. UAL2096)"
        className="flex-1 rounded border-2 border-border bg-card px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        spellCheck={false}
        autoComplete="off"
        aria-label="Flight callsign"
        data-testid="aircraft-search-input"
      />
      <button
        type="submit"
        disabled={loading}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded border-2 border-border px-4 py-2 font-mono text-sm font-bold uppercase tracking-wider',
          'bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50',
        )}
        data-testid="aircraft-search-submit"
      >
        <Search className="h-4 w-4" aria-hidden />
        {loading ? 'Searching…' : 'Track'}
      </button>
    </form>
  );
}
