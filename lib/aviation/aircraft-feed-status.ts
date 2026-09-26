export interface AircraftFeedStatus {
  state: 'loading' | 'ready' | 'unavailable';
  count: number | null;
  source: string | null;
  degraded: boolean;
  updatedAt: number | null;
}

export const INITIAL_AIRCRAFT_STATUS: AircraftFeedStatus = {
  state: 'loading', count: null, source: null, degraded: false, updatedAt: null,
};

export function aircraftFeedLabel(status: AircraftFeedStatus): string {
  if (status.state === 'unavailable') return 'Aircraft traffic unavailable';
  if (status.state === 'loading') return status.updatedAt ? 'Updating traffic — previous positions shown' : 'Loading aircraft traffic…';
  const source = `${status.degraded ? 'Backup feed · ' : ''}${status.source ?? 'Aircraft feed'}`;
  return status.count === 0 ? `${source} · No aircraft returned in this area` : `${source} · ${status.count} aircraft in this area`;
}
