// ISO 3166-1 alpha-2 countries and territories. Names come from the runtime's
// CLDR registry so every code uses the same English naming convention.
const COUNTRY_CODES = `AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ
BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ
CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ
DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR
GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY
HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP
KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY
MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ
NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY
QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ
TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ
VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW`.split(/\s+/);

/** Match typed names and URL slugs despite accents, apostrophes, and separators. */
export function normalizePlaceHint(value: string): string {
  return value.normalize('NFKD').replace(/\p{M}/gu, '')
    .toLowerCase().replace(/['’.]/g, '').replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ').trim();
}
const countryNames = new Intl.DisplayNames(['en'], { type: 'region' });
const countryHints = new Map(COUNTRY_CODES.flatMap((code) => [
  [code.toLowerCase(), code],
  [normalizePlaceHint(countryNames.of(code)!), code],
]));
countryHints.set('uk', 'GB');
countryHints.set('great britain', 'GB');
countryHints.set('czech republic', 'CZ');
countryHints.set('turkey', 'TR');
countryHints.set('united states of america', 'US');

/** Country codes and names accepted by weather search and city routes. */
export function normalizeCountryHint(value: string): string | null {
  return countryHints.get(normalizePlaceHint(value)) ?? null;
}
