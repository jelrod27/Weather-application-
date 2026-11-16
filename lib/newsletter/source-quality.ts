import { DAY_MS } from './coverage';
import type { CoverageAudit } from './coverage';

export const CONUS_QUADRANTS: ReadonlyArray<{ region: string; lat: number; lon: number }> = [
  { region: 'Northeast (NYC area)', lat: 40.71, lon: -74.0 },
  { region: 'Southeast (Atlanta area)', lat: 33.75, lon: -84.39 },
  { region: 'Midwest (Chicago area)', lat: 41.88, lon: -87.63 },
  { region: 'Mountain West (Denver area)', lat: 39.74, lon: -104.99 },
  { region: 'Pacific (San Francisco area)', lat: 37.77, lon: -122.42 },
  { region: 'South Plains (Dallas area)', lat: 32.78, lon: -96.8 },
];

/** Pure policy shared by collection, publication, draft review and PR validation. */
export function sundaySourceErrors(audit: CoverageAudit): string[] {
  if (audit.cadence !== 'sunday_rearview') return [];
  const start = new Date(audit.generatedAt);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start.getTime() + 7 * DAY_MS).toISOString();
  const missingCities = CONUS_QUADRANTS.filter(region => !audit.sources.some(source =>
    source.id === `forecast-${region.lat}-${region.lon}` && source.usable && source.status === 'complete' &&
    source.expectedUnits === 7 && source.observedUnits === 7 &&
    source.requested.start === start.toISOString() && source.requested.end === end));
  const errors = missingCities.length
    ? [`Core city forecasts incomplete (${CONUS_QUADRANTS.length - missingCities.length}/${CONUS_QUADRANTS.length} U.S. cities ready): ${missingCities.map(city => city.region).join(', ')}. Hold this edition; restore the forecasts before publication.`]
    : [];
  for (const id of ['wpc-short-range', 'wpc-medium-range']) {
    if (!audit.sources.some(source => source.id === id && source.usable && ['complete', 'partial'].includes(source.status))) {
      errors.push(`Core national outlook unavailable: ${id}. Hold this edition until a current discussion is available.`);
    }
  }
  return errors;
}
