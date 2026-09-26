const COUNTRY_CODES = [
  'US', 'GB', 'CA', 'AU', 'DE', 'FR', 'IT', 'ES', 'JP', 'CN', 'IN',
  'BR', 'RU', 'MX', 'NL', 'BE', 'CH', 'AT', 'SE', 'NO', 'DK', 'FI',
  'IE', 'PT', 'GR', 'TR', 'PL', 'CZ', 'HU', 'RO', 'BG', 'HR', 'SI',
  'SK', 'LT', 'LV', 'EE', 'IS', 'MT', 'CY', 'LU', 'NZ',
];
const countryNames = new Intl.DisplayNames(['en'], { type: 'region' });
const countryHints = new Map(COUNTRY_CODES.flatMap((code) => [
  [code.toLowerCase(), code],
  [countryNames.of(code)!.toLowerCase(), code],
]));
countryHints.set('uk', 'GB');
countryHints.set('great britain', 'GB');
countryHints.set('czech republic', 'CZ');
countryHints.set('turkey', 'TR');

/** Country codes and names accepted by weather search and city routes. */
export function normalizeCountryHint(value: string): string | null {
  return countryHints.get(value.trim().toLowerCase()) ?? null;
}
