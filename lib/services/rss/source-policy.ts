import type { FeedSource } from './feedSources';

export interface SourcePolicy {
  refreshMs: number;
  freshMs: number;
  retainMs: number;
  coverage: string;
}

const MINUTE = 60_000;

/** Application polling/retention budgets, not promises of publisher completeness. */
export function sourcePolicy(source: FeedSource): SourcePolicy {
  if (source.id === 'nws-alerts') return {
    refreshMs: 2 * MINUTE, freshMs: 5 * MINUTE, retainMs: 60 * MINUTE,
    coverage: 'NWS national actual alerts; verified-active lane includes warnings only',
  };
  if (source.id.startsWith('usgs-') && source.category === 'earthquakes') return {
    refreshMs: 5 * MINUTE, freshMs: 15 * MINUTE, retainMs: 24 * 60 * MINUTE,
    coverage: source.id === 'usgs-significant' ? 'USGS significant events, past seven days' : `USGS ${source.id === 'usgs-m45' ? 'M4.5+' : 'M2.5+'} events, past day`,
  };
  const refreshMs = source.refreshInterval * MINUTE;
  return {
    refreshMs, freshMs: refreshMs * 2,
    retainMs: ['severe', 'hurricanes'].includes(source.category) ? 6 * 60 * MINUTE : 48 * 60 * MINUTE,
    coverage: source.id === 'usgs-volcanoes'
      ? 'USGS elevated-volcano notices; identity and current active status are not verified'
      : 'Items supplied by this feed; not a complete archive or proof of no events',
  };
}
