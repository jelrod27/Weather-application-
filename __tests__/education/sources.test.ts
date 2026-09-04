import { isAllowedSourceUrl } from '@/lib/education/content';
import { getEligibleEntries } from '../../scripts/education/queue';
import {
  candidateSourcesFor,
  getSourceById,
  SOURCES,
  sourcesForTags,
  UnknownPinnedSourceError,
} from '../../scripts/education/sources';
import { GUIDE_BRIEFS, getGuideBrief } from '../../scripts/education/topics';

describe('the source catalog', () => {
  it('gives every entry a unique id', () => {
    const ids = SOURCES.map((source) => source.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('only carries URLs the Guide loader will accept', () => {
    // A citation on an unlisted host is dropped by getGuideContent with nothing
    // but a console warning, so it has to be impossible to put one here.
    const rejected = SOURCES.filter((source) => !isAllowedSourceUrl(source.url));
    expect(rejected.map((source) => `${source.id}: ${source.url}`)).toEqual([]);
  });

  it('tags every entry with at least one subject', () => {
    expect(SOURCES.filter((source) => source.tags.length === 0)).toEqual([]);
  });

  it('resolves ids and refuses inherited object keys', () => {
    expect(getSourceById('spc-faq')?.url).toBe('https://www.spc.noaa.gov/faq/');
    expect(getSourceById('constructor')).toBeNull();
    expect(getSourceById('__proto__')).toBeNull();
  });
});

describe('sourcesForTags', () => {
  it('ranks a source matching two of the asked-for tags above one matching one', () => {
    const picks = sourcesForTags(['clouds', 'cloud-formation'], 3);
    expect(picks[0].tags).toEqual(expect.arrayContaining(['clouds', 'cloud-formation']));
  });

  it("weights by the brief's tag order, so every first-tag source outranks any source without it", () => {
    // Tropical Cyclones lists `tropical` first. Counting matches without
    // weighting put Derechos and Bow Echoes (one `wind` match) level with
    // Tropical Cyclone Structure (one `tropical` match), and catalog order then
    // offered the storm pages and left the Saffir-Simpson page out.
    const picks = sourcesForTags(['tropical', 'ocean', 'wind', 'flood'], 12);
    const isTropical = picks.map((source) => source.tags.includes('tropical'));
    const lastTropical = isTropical.lastIndexOf(true);
    const firstOther = isTropical.indexOf(false);
    expect(lastTropical).toBeGreaterThan(-1);
    expect(firstOther === -1 || firstOther > lastTropical).toBe(true);
    expect(picks.map((source) => source.id)).toEqual(
      expect.arrayContaining([
        'nhc-sshws',
        'jetstream-tropical-tropical-cyclone-introduction-tropical-cyclone-structure',
      ]),
    );
  });

  it('lets a source carrying only the first tag outrank one carrying every other tag', () => {
    // Linear weights (4, 3, 2, 1) let ocean + flood + precipitation (6) beat a
    // tropical-only glossary entry (4). Halving weights (8, 4, 2, 1) cannot: the
    // tags after the first sum to less than it.
    const picks = sourcesForTags(['tropical', 'ocean', 'flood', 'precipitation'], SOURCES.length);
    const ids = picks.map((source) => source.id);
    const rivers = getSourceById('noaa-atmospheric-rivers');
    expect(rivers?.tags).toEqual(expect.arrayContaining(['ocean', 'flood', 'precipitation']));
    expect(rivers?.tags).not.toContain('tropical');
    expect(ids.indexOf('glossary-eye')).toBeLessThan(ids.indexOf('noaa-atmospheric-rivers'));
  });

  it('returns nothing for a tag no source carries', () => {
    expect(sourcesForTags([], 5)).toEqual([]);
  });

  it('respects the limit', () => {
    expect(sourcesForTags(['clouds'], 2)).toHaveLength(2);
  });
});

describe('candidateSourcesFor', () => {
  it('offers the NOAA blocking-pattern explainer to the Blocking Highs brief', () => {
    const brief = getGuideBrief('weather-system', 'blocking-highs');

    expect(brief).not.toBeNull();
    expect(candidateSourcesFor(brief!, 12).map((source) => source.id)).toContain(
      'cpc-atmospheric-blocking-background',
    );
  });

  it('offers the NWS depression definition to the Depressions brief', () => {
    const brief = getGuideBrief('weather-system', 'depressions');

    expect(brief).not.toBeNull();
    expect(candidateSourcesFor(brief!, 12).map((source) => source.id)).toContain(
      'glossary-depression',
    );
  });

  it.each([
    ['weather-system', 'stationary-fronts', 'glossary-training'],
    ['weather-system', 'jet-streams', 'glossary-jet-streak'],
    ['weather-system', 'monsoons', 'nws-twc-monsoon-info'],
    ['weather-system', 'monsoons', 'nws-fgz-monsoon-info'],
    ['weather-system', 'squall-lines', 'jetstream-derechos-bow-echoes'],
    ['weather-system', 'squall-lines', 'glossary-bow-echo'],
    ['weather-system', 'mesoscale-convective-complexes', 'jetstream-thunderstorms-flood'],
    ['weather-system', 'mesoscale-convective-complexes', 'glossary-low-level-jet'],
    ['phenomenon', 'haboob', 'glossary-gust-front'],
  ])('offers %s:%s the page its focus line rests on (%s)', (kind, slug, id) => {
    const brief = getGuideBrief(kind, slug);

    expect(brief).not.toBeNull();
    expect(candidateSourcesFor(brief!, 12).map((source) => source.id)).toContain(id);
  });

  it('offers pinned sources first and fills the rest by rank without repeating them', () => {
    const picks = candidateSourcesFor(
      { tags: ['clouds'], pin: ['glossary-inversion', 'jetstream-clouds'] },
      5,
    );
    expect(picks.slice(0, 2).map((source) => source.id)).toEqual(['glossary-inversion', 'jetstream-clouds']);
    expect(picks).toHaveLength(5);
    expect(new Set(picks.map((source) => source.id)).size).toBe(5);
  });

  it('collapses a repeated pin id to one candidate', () => {
    const picks = candidateSourcesFor(
      { tags: ['clouds'], pin: ['jetstream-clouds', 'jetstream-clouds'] },
      5,
    );
    expect(picks[0].id).toBe('jetstream-clouds');
    expect(picks.filter((source) => source.id === 'jetstream-clouds')).toHaveLength(1);
    expect(new Set(picks.map((source) => source.id)).size).toBe(picks.length);
  });

  it('refuses a pin that is not in the catalog', () => {
    expect(() => candidateSourcesFor({ tags: ['clouds'], pin: ['jetstream-made-up'] }, 5)).toThrow(
      UnknownPinnedSourceError,
    );
  });

  it('is plain tag ranking when nothing is pinned', () => {
    expect(candidateSourcesFor({ tags: ['clouds', 'cloud-formation'] }, 3)).toEqual(
      sourcesForTags(['clouds', 'cloud-formation'], 3),
    );
  });
});

describe('the drafting briefs', () => {
  const eligible = getEligibleEntries();

  it('cover exactly the eligible Entries', () => {
    const briefKeys = new Set(Object.keys(GUIDE_BRIEFS));
    const eligibleKeys = new Set(eligible.map((entry) => `${entry.kind}:${entry.slug}`));
    expect([...briefKeys].filter((key) => !eligibleKeys.has(key))).toEqual([]);
    expect([...eligibleKeys].filter((key) => !briefKeys.has(key))).toEqual([]);
  });

  it('give every Entry enough candidate sources to satisfy the citation floor', () => {
    const starved = eligible
      .map((entry) => ({ entry, brief: getGuideBrief(entry.kind, entry.slug)! }))
      .filter(({ brief }) => candidateSourcesFor(brief, 12).length < 4)
      .map(({ entry }) => `${entry.kind}:${entry.slug}`);
    expect(starved).toEqual([]);
  });

  it('gives every Entry a focus line', () => {
    const empty = Object.entries(GUIDE_BRIEFS)
      .filter(([, brief]) => brief.focus.trim().length < 40)
      .map(([key]) => key);
    expect(empty).toEqual([]);
  });

  it('pin only sources that exist in the catalog', () => {
    const broken = Object.entries(GUIDE_BRIEFS).flatMap(([key, brief]) =>
      (brief.pin ?? []).filter((id) => !getSourceById(id)).map((id) => `${key}: ${id}`),
    );
    expect(broken).toEqual([]);
  });

  it('commission no dated events: a focus line never carries a year', () => {
    // The catalog is federal reference text about mechanism. It will never
    // state that sprites were first photographed in 1989, so a brief asking
    // for that is asking for the unsupported claim the fact check then refuses.
    const dated = Object.entries(GUIDE_BRIEFS)
      .filter(([, brief]) => /\b(?:1[5-9]|20)\d{2}\b/.test(brief.focus))
      .map(([key]) => key);
    expect(dated).toEqual([]);
  });
});
