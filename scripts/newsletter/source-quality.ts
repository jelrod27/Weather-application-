import { DAY_MS } from '@/lib/newsletter/coverage';
import { CONUS_QUADRANTS } from './data/forecast';
import type { CoverageAudit } from '@/lib/newsletter/coverage';

/** Core Sunday sections must exist before prose generation or PR preparation. */
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
    ? [`Core city forecasts incomplete (${CONUS_QUADRANTS.length - missingCities.length}/${CONUS_QUADRANTS.length} U.S. cities ready): ${missingCities.map(city => city.region).join(', ')}. Hold this edition; restore the forecasts before generating a publishing PR.`]
    : [];
  for (const id of ['wpc-short-range', 'wpc-medium-range']) {
    if (!audit.sources.some(source => source.id === id && source.usable && ['complete', 'partial'].includes(source.status))) {
      errors.push(`Core national outlook unavailable: ${id}. Hold this edition until a current discussion is available.`);
    }
  }
  return errors;
}
