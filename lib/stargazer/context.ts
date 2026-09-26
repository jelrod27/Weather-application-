export type StargazerEquipment = 'eyes' | 'binoculars' | 'telescope';

export interface StargazerCoordinates { lat: number; lon: number }

export interface StargazerContext {
  coordinates: StargazerCoordinates | null;
  invalidCoordinates: boolean;
  label: string;
  at: number | null;
  equipment: StargazerEquipment;
  timeZone?: string;
  from: 'start' | 'targets';
}

/** Read the entire decimal value; parseFloat would accept a malformed shared link. */
export function parseStargazerCoordinates(lat: string | null, lon: string | null): StargazerCoordinates | null {
  const decimal = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/;
  if (!lat || !lon || !decimal.test(lat) || !decimal.test(lon)) return null;
  const coordinates = { lat: Number(lat), lon: Number(lon) };
  return Number.isFinite(coordinates.lat) && Number.isFinite(coordinates.lon) &&
    Math.abs(coordinates.lat) <= 90 && Math.abs(coordinates.lon) <= 180 ? coordinates : null;
}

export function isStargazerTimeZone(value: string | null | undefined): value is string {
  if (!value) return false;
  try { new Intl.DateTimeFormat('en-US', { timeZone: value }); return true; } catch { return false; }
}

export function readStargazerContext(params: Pick<URLSearchParams, 'get'>): StargazerContext {
  const lat = params.get('lat');
  const lon = params.get('lon');
  const coordinates = parseStargazerCoordinates(lat, lon);
  const rawTime = params.get('at');
  const instant = rawTime && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(rawTime) ? Date.parse(rawTime) : NaN;
  const canonicalTime = rawTime?.length === 20 ? rawTime.replace('Z', '.000Z') : rawTime;
  const equipment = params.get('equipment');
  const zone = params.get('tz');
  return {
    coordinates, invalidCoordinates: (lat !== null || lon !== null) && !coordinates,
    label: (params.get('q') ?? '').trim().slice(0, 200),
    at: Number.isFinite(instant) && new Date(instant).toISOString() === canonicalTime ? instant : null,
    equipment: equipment === 'binoculars' || equipment === 'telescope' ? equipment : 'eyes',
    timeZone: isStargazerTimeZone(zone) ? zone : undefined,
    from: params.get('from') === 'targets' ? 'targets' : 'start',
  };
}

/** Only constructs internal Stargazer destinations and allowlisted context. */
export function getStargazerHref(
  context: StargazerContext,
  destination: { objectId?: string; catalog?: boolean; tab?: string } = {},
): string {
  const params = new URLSearchParams();
  if (context.coordinates) {
    params.set('lat', String(context.coordinates.lat));
    params.set('lon', String(context.coordinates.lon));
  }
  if (context.label) params.set('q', context.label);
  if (isStargazerTimeZone(context.timeZone)) params.set('tz', context.timeZone);
  if (context.at !== null && Number.isFinite(context.at) && Number.isFinite(new Date(context.at).getTime())) {
    params.set('at', new Date(context.at).toISOString());
  }
  params.set('equipment', context.equipment);
  params.set('from', context.from);
  const path = destination.objectId ? `/stargazer/objects/${encodeURIComponent(destination.objectId)}`
    : destination.catalog ? '/stargazer/objects' : '/stargazer';
  const tab = destination.tab && ['start', 'conditions', 'targets', 'events', 'launches'].includes(destination.tab)
    ? `#${destination.tab}` : '';
  return `${path}?${params}${tab}`;
}

/** Includes a date and UTC offset so repeated DST hours remain distinguishable. */
export function formatObservingTime(instant: number, timeZone?: string): string {
  if (!Number.isFinite(instant)) return 'Time unavailable';
  return new Intl.DateTimeFormat('en-US', {
    timeZone: isStargazerTimeZone(timeZone) ? timeZone : 'UTC', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true, timeZoneName: 'shortOffset',
  }).format(instant);
}
