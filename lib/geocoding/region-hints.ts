import { normalizePlaceHint } from '@/lib/geocoding/country-hints';
import { toStateAbbr } from '@/lib/us-states';

const REGIONS: Record<string, Record<string, string>> = {
  CA: {
    AB: 'Alberta', BC: 'British Columbia', MB: 'Manitoba', NB: 'New Brunswick',
    NL: 'Newfoundland and Labrador', NS: 'Nova Scotia', NT: 'Northwest Territories',
    NU: 'Nunavut', ON: 'Ontario', PE: 'Prince Edward Island', QC: 'Quebec',
    SK: 'Saskatchewan', YT: 'Yukon',
  },
  AU: {
    ACT: 'Australian Capital Territory', NSW: 'New South Wales', NT: 'Northern Territory',
    QLD: 'Queensland', SA: 'South Australia', TAS: 'Tasmania', VIC: 'Victoria', WA: 'Western Australia',
  },
};

/** Region aliases are meaningful only within their explicitly selected country. */
export function normalizeRegionHint(value: string, country: string): string | null {
  if (country === 'US') return toStateAbbr(value);
  const hint = normalizePlaceHint(value);
  const match = Object.entries(REGIONS[country] ?? {}).find(([code, name]) =>
    normalizePlaceHint(code) === hint || normalizePlaceHint(name) === hint);
  return match ? normalizePlaceHint(match[1]) : null;
}
