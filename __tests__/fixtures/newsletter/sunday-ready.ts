import { DAY_MS } from '@/lib/newsletter/coverage';
import { CONUS_QUADRANTS } from '../../../scripts/newsletter/data/forecast';
import type { CoverageAudit } from '@/lib/newsletter/coverage';
import type { SundayEvidence } from '../../../scripts/newsletter/data/sunday-evidence';

/** Synthetic complete core sources; callers retain any partial side-source fixture. */
export function readySundayEvidence(coverage: CoverageAudit): SundayEvidence {
  const start = new Date(coverage.generatedAt);
  start.setUTCHours(0, 0, 0, 0);
  const window = { start: start.toISOString(), end: new Date(start.getTime() + 7 * DAY_MS).toISOString() };
  const daily = Array.from({ length: 7 }, (_, day) => ({
    date: new Date(start.getTime() + day * DAY_MS).toISOString().slice(0, 10),
    tMaxF: 60, tMinF: 40, precipIn: 0, precipProb: 0, weatherCode: 0,
  }));
  const base = {
    requested: window, covered: [window], retrievedAt: coverage.generatedAt, usable: true,
    status: 'complete' as const, observationStart: window.start, observationEnd: window.start, reasons: [],
  };
  const discussion = { label: 'Synthetic WPC discussion', url: 'https://www.wpc.ncep.noaa.gov/discussions/pmdspdbody.txt',
    issuedAt: coverage.generatedAt, valid: window, text: 'Synthetic discussion supporting the test outlook.' };
  return {
    warnings: null, spcSummary: null, spaceSummary: null, quakeSummary: null,
    forecast: { conusQuadrants: CONUS_QUADRANTS.map(region => ({ ...region, daily })), international: [], fetchedAt: coverage.generatedAt },
    national: { shortRange: discussion, mediumRange: discussion },
    coverage: { ...coverage, sources: [...coverage.sources,
      ...CONUS_QUADRANTS.map(region => ({ ...base,
        id: `forecast-${region.lat}-${region.lon}`, label: region.region, url: 'https://api.open-meteo.com/v1/forecast',
        records: 7, expectedUnits: 7, observedUnits: 7, unit: 'UTC forecast days',
      })),
      ...['wpc-short-range', 'wpc-medium-range'].map(id => ({ ...base, id, label: id,
        url: discussion.url, records: 1, unit: 'forecast discussion',
      })),
    ] },
  };
}
