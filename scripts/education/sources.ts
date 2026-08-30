/**
 * The Guide source catalog.
 *
 * Guides cite NOAA and NWS material by catalog id and nothing else. A drafting
 * model never emits a URL — it picks from the ids this file offers, and the
 * publish step resolves them. That is the containment `images.ts` gives the
 * newsletter's imagery and `diagrams.ts` gives Guide diagrams, applied to
 * citations (planning/adr/0002): generated content stays data, and a plausible
 * but non-existent `weather.gov/...` URL cannot reach a published page.
 *
 * Every URL here must also satisfy `isAllowedSourceUrl` in
 * `lib/education/content.ts` — the loader drops citations on unlisted hosts, so
 * an entry that fails it would be silently discarded at render time. A test
 * asserts that; `npm run validate:education-sources` checks the URLs resolve.
 *
 * NOAA/NWS text is public domain under 17 U.S.C. § 105 and safe to adapt.
 * Images on those pages are not automatically — this catalog is text only.
 */

/**
 * Subject tags. Entries are matched to sources through these rather than by
 * naming URLs per Entry, so a new source becomes available to every Guide that
 * already carries the tag. `topics.ts` maps each of the 29 Entries to its tags.
 */
export type SourceTag =
  | 'air-masses'
  | 'atmosphere'
  | 'cloud-formation'
  | 'clouds'
  | 'downburst'
  | 'dust'
  | 'flood'
  | 'fronts'
  | 'global-circulation'
  | 'hail'
  | 'jet-stream'
  | 'lightning'
  | 'mid-latitude-cyclone'
  | 'monsoon'
  | 'ocean'
  | 'optics'
  | 'orographic'
  | 'precipitation'
  | 'pressure'
  | 'safety'
  | 'severe'
  | 'stability'
  | 'synoptic'
  | 'thunderstorms'
  | 'tornado'
  | 'tropical'
  | 'upper-air'
  | 'wind'
  | 'winter';

export interface SourceEntry {
  /** Stable id. The only thing a draft is allowed to reference. */
  id: string;
  /** Rendered as the citation text in the Sources section. */
  label: string;
  url: string;
  tags: SourceTag[];
}

const GLOSSARY = 'https://forecast.weather.gov/glossary.php?word=';
const JETSTREAM = 'https://www.noaa.gov/jetstream/';

/** NWS Glossary entry. `term` is URL-encoded, so pass it unencoded. */
function glossary(term: string, tags: SourceTag[]): SourceEntry {
  const label = term.replace(/\b[a-z]/g, (c) => c.toUpperCase());
  return {
    id: `glossary-${term.replace(/\s+/g, '-')}`,
    label: `NWS Glossary — ${label}`,
    url: `${GLOSSARY}${encodeURIComponent(term)}`,
    tags,
  };
}

/** NOAA JetStream page. `path` is everything after `/jetstream/`. */
function jetstream(path: string, title: string, tags: SourceTag[]): SourceEntry {
  return {
    id: `jetstream-${path.replace(/\//g, '-').replace(/_/g, '-')}`,
    label: `NOAA JetStream — ${title}`,
    url: `${JETSTREAM}${path}`,
    tags,
  };
}

export const SOURCES: SourceEntry[] = [
  // --- NOAA JetStream: clouds and the atmosphere -------------------------
  jetstream('clouds', 'Clouds', ['clouds']),
  jetstream('clouds/how-clouds-form', 'How Clouds Form', ['clouds', 'cloud-formation']),
  jetstream('clouds/four-core-types-of-clouds', 'Four Core Types of Clouds', ['clouds']),
  jetstream('clouds/ten-basic-clouds', 'Ten Basic Clouds', ['clouds']),
  jetstream('clouds/color-of-clouds', 'The Color of Clouds', ['clouds', 'optics']),
  jetstream('atmosphere', 'The Atmosphere', ['atmosphere']),
  jetstream('atmosphere/layers-of-atmosphere', 'Layers of the Atmosphere', [
    'atmosphere',
    'upper-air',
  ]),
  jetstream('atmosphere/air-pressure', 'Air Pressure', ['pressure', 'atmosphere']),
  jetstream('atmosphere/hydro', 'The Hydrologic Cycle', ['cloud-formation', 'precipitation']),
  jetstream('atmosphere/precipitation', 'Precipitation', ['precipitation']),
  jetstream('atmosphere/transfer-of-heat-energy', 'Transfer of Heat Energy', [
    'atmosphere',
    'stability',
  ]),
  jetstream('upperair/parcel-theory', 'Parcel Theory', ['stability', 'cloud-formation']),
  jetstream('upperair/skew-t-log-p-diagrams', 'Skew-T Log-P Diagrams', ['stability', 'upper-air']),

  // --- NOAA JetStream: convection ----------------------------------------
  jetstream('thunderstorms', 'Thunderstorms', ['thunderstorms']),
  jetstream('thunderstorms/ingredients-for-thunderstorm', 'Ingredients for a Thunderstorm', [
    'thunderstorms',
    'stability',
  ]),
  jetstream('thunderstorms/life-cycle-of-thunderstorm', 'Life Cycle of a Thunderstorm', [
    'thunderstorms',
    'downburst',
  ]),
  jetstream('thunderstorms/thunderstorm-hazards-tornadoes', 'Thunderstorm Hazards — Tornadoes', [
    'severe',
    'tornado',
    'thunderstorms',
  ]),
  jetstream('thunderstorms/flood', 'Thunderstorm Hazards — Flooding', ['flood', 'precipitation']),
  jetstream('thunderstorms/staying-ahead-of-storms', 'Staying Ahead of the Storms', [
    'safety',
    'thunderstorms',
  ]),
  jetstream('hail', 'Hail', ['hail', 'severe']),
  jetstream('derechos', 'Derechos', ['severe', 'wind']),
  jetstream('derechos/bow-echoes', 'Bow Echoes', ['severe', 'wind']),
  jetstream('wind_damage', 'Wind Damage', ['wind', 'severe', 'downburst']),
  jetstream('lightning', 'Lightning', ['lightning']),
  jetstream('lightning/how-lightning-is-created', 'How Lightning is Created', ['lightning']),
  jetstream('lightning/sound-of-thunder', 'The Sound of Thunder', ['lightning', 'atmosphere']),
  jetstream('lightning/frequently-asked-questions', 'Lightning FAQ', ['lightning', 'atmosphere']),

  // --- NOAA JetStream: synoptic and global scale -------------------------
  jetstream('synoptic', 'Synoptic Meteorology', ['synoptic']),
  jetstream('synoptic/air-masses', 'Air Masses', ['air-masses', 'synoptic']),
  jetstream('synoptic/norwegian-cyclone-model', 'The Norwegian Cyclone Model', [
    'mid-latitude-cyclone',
    'fronts',
  ]),
  jetstream('synoptic/origin-of-wind', 'The Origin of Wind', ['wind', 'pressure']),
  jetstream('synoptic/types-of-weather-phenomena', 'Types of Weather Phenomena', ['synoptic']),
  jetstream('global', 'Global Weather', ['global-circulation']),
  jetstream('global/global-atmospheric-circulations', 'Global Atmospheric Circulations', [
    'global-circulation',
    'monsoon',
  ]),
  jetstream('global/jet-stream', 'The Jet Stream', ['jet-stream', 'upper-air']),
  jetstream('upper-air-charts/basic-wave-patterns', 'Basic Wave Patterns', [
    'upper-air',
    'jet-stream',
  ]),
  jetstream('upper-air-charts/longwaves-and-shortwaves', 'Longwaves and Shortwaves', [
    'upper-air',
    'jet-stream',
  ]),
  jetstream('upper-air-charts/constant-pressure-charts-500-mb', '500 mb Constant Pressure Charts', [
    'upper-air',
    'pressure',
  ]),

  // --- NOAA JetStream: tropics and ocean ---------------------------------
  jetstream('tropical', 'Tropical Weather', ['tropical']),
  jetstream('tropical/tropical-cyclone-introduction', 'Introduction to Tropical Cyclones', [
    'tropical',
  ]),
  jetstream(
    'tropical/tropical-cyclone-introduction/tropical-cyclone-structure',
    'Tropical Cyclone Structure',
    ['tropical'],
  ),
  jetstream(
    'tropical/tropical-cyclone-introduction/tropical-cyclone-classification',
    'Tropical Cyclone Classification',
    ['tropical'],
  ),
  jetstream('tc-hazards', 'Tropical Cyclone Hazards', ['tropical', 'flood', 'wind']),
  jetstream('tropical/enso', 'El Niño and La Niña', ['global-circulation', 'ocean']),
  jetstream('ocean', 'The Ocean', ['ocean']),
  jetstream('ocean/sea-breeze', 'The Sea Breeze', ['ocean', 'cloud-formation']),
  jetstream('ocean/circulations', 'Ocean Circulations', ['ocean', 'global-circulation']),

  // --- NWS safety pages ---------------------------------------------------
  {
    id: 'safety-thunderstorm',
    label: 'NWS — Thunderstorm safety',
    url: 'https://www.weather.gov/safety/thunderstorm',
    tags: ['safety', 'thunderstorms'],
  },
  {
    id: 'safety-lightning',
    label: 'NWS — Lightning safety',
    url: 'https://www.weather.gov/safety/lightning',
    tags: ['safety', 'lightning'],
  },
  {
    id: 'safety-winter',
    label: 'NWS — Winter weather safety',
    url: 'https://www.weather.gov/safety/winter',
    tags: ['safety', 'winter'],
  },
  {
    id: 'safety-cold',
    label: 'NWS — Cold weather safety',
    url: 'https://www.weather.gov/safety/cold',
    tags: ['safety', 'winter'],
  },
  {
    id: 'safety-wind',
    label: 'NWS — Wind safety',
    url: 'https://www.weather.gov/safety/wind',
    tags: ['safety', 'wind'],
  },
  {
    id: 'safety-flood',
    label: 'NWS — Flood safety',
    url: 'https://www.weather.gov/safety/flood',
    tags: ['safety', 'flood'],
  },
  {
    id: 'safety-tornado',
    label: 'NWS — Tornado safety',
    url: 'https://www.weather.gov/safety/tornado',
    tags: ['safety', 'tornado'],
  },
  {
    id: 'safety-dust-storm',
    label: 'NWS — Dust storms and haboobs',
    url: 'https://www.weather.gov/safety/wind-dust-storm',
    tags: ['dust', 'wind', 'safety'],
  },

  // --- SPC and NHC --------------------------------------------------------
  {
    id: 'spc-faq',
    label: 'NOAA Storm Prediction Center — FAQ',
    url: 'https://www.spc.noaa.gov/faq/',
    tags: ['severe', 'thunderstorms', 'tornado'],
  },
  {
    id: 'spc-derecho-facts',
    label: 'NOAA Storm Prediction Center — Facts about derechos',
    url: 'https://www.spc.noaa.gov/misc/AbtDerechos/derechofacts.htm',
    tags: ['severe', 'wind'],
  },
  {
    id: 'nhc-sshws',
    label: 'NOAA National Hurricane Center — Saffir-Simpson scale',
    url: 'https://www.nhc.noaa.gov/aboutsshws.php',
    tags: ['tropical'],
  },
  {
    id: 'nhc-climatology',
    label: 'NOAA National Hurricane Center — Tropical cyclone climatology',
    url: 'https://www.nhc.noaa.gov/climo/',
    tags: ['tropical', 'ocean'],
  },

  // --- NWS Glossary -------------------------------------------------------
  glossary('cirrus', ['clouds']),
  glossary('cirrostratus', ['clouds', 'optics']),
  glossary('cumulus', ['clouds']),
  glossary('stratus', ['clouds']),
  glossary('stratocumulus', ['clouds']),
  glossary('nimbostratus', ['clouds', 'precipitation']),
  glossary('altocumulus', ['clouds']),
  glossary('lenticular', ['clouds', 'orographic']),
  glossary('mountain wave', ['orographic', 'wind']),
  glossary('orographic', ['orographic', 'cloud-formation']),
  glossary('virga', ['clouds', 'precipitation']),
  glossary('mammatus', ['clouds', 'severe']),
  glossary('inversion', ['stability', 'atmosphere']),
  glossary('advection', ['synoptic', 'atmosphere']),
  glossary('convergence', ['synoptic', 'pressure']),
  glossary('low pressure system', ['pressure', 'synoptic']),
  glossary('anticyclone', ['pressure', 'synoptic']),
  glossary('extratropical cyclone', ['mid-latitude-cyclone', 'pressure']),
  glossary('trough', ['upper-air', 'pressure']),
  glossary('shortwave', ['upper-air', 'jet-stream']),
  glossary('jet stream', ['jet-stream', 'upper-air']),
  glossary('monsoon', ['monsoon', 'global-circulation']),
  glossary('cold front', ['fronts', 'air-masses']),
  glossary('warm front', ['fronts', 'air-masses']),
  glossary('occluded front', ['fronts', 'mid-latitude-cyclone']),
  glossary('stationary front', ['fronts', 'air-masses']),
  glossary('thunderstorm', ['thunderstorms']),
  glossary('supercell', ['severe', 'thunderstorms']),
  glossary('squall line', ['severe', 'thunderstorms']),
  glossary('mesoscale convective complex', ['severe', 'thunderstorms']),
  glossary('bow echo', ['severe', 'wind']),
  glossary('gust front', ['downburst', 'thunderstorms']),
  glossary('downburst', ['downburst', 'wind']),
  glossary('microburst', ['downburst', 'severe']),
  glossary('dust storm', ['dust', 'wind']),
  glossary('graupel', ['winter', 'precipitation']),
  glossary('snow squall', ['winter', 'precipitation']),
  glossary('parhelion', ['optics']),
  glossary('halo', ['optics', 'clouds']),
];

const BY_ID: ReadonlyMap<string, SourceEntry> = new Map(SOURCES.map((s) => [s.id, s]));

/** Resolves a catalog id, or null when nobody registered it. */
export function getSourceById(id: string): SourceEntry | null {
  return BY_ID.get(id) ?? null;
}

/**
 * Candidate sources for a set of subject tags, most relevant first.
 *
 * Relevance is the number of the Entry's tags a source carries, so a page
 * tagged both `clouds` and `cloud-formation` outranks one tagged only
 * `clouds` for a Guide that asked for both. Ties keep catalog order, which
 * puts JetStream explainers ahead of one-paragraph glossary entries.
 */
export function sourcesForTags(tags: readonly SourceTag[], limit: number): SourceEntry[] {
  const wanted = new Set(tags);
  return SOURCES.map((source) => ({
    source,
    score: source.tags.reduce((n, tag) => (wanted.has(tag) ? n + 1 : n), 0),
  }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ source }) => source);
}
