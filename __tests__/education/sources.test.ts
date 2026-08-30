import { isAllowedSourceUrl } from '@/lib/education/content';
import { getEligibleEntries } from '../../scripts/education/queue';
import { getSourceById, SOURCES, sourcesForTags } from '../../scripts/education/sources';
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

  it('returns nothing for a tag no source carries', () => {
    expect(sourcesForTags([], 5)).toEqual([]);
  });

  it('respects the limit', () => {
    expect(sourcesForTags(['clouds'], 2)).toHaveLength(2);
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
      .filter(({ brief }) => sourcesForTags(brief.tags, 8).length < 4)
      .map(({ entry }) => `${entry.kind}:${entry.slug}`);
    expect(starved).toEqual([]);
  });

  it('gives every Entry a focus line', () => {
    const empty = Object.entries(GUIDE_BRIEFS)
      .filter(([, brief]) => brief.focus.trim().length < 40)
      .map(([key]) => key);
    expect(empty).toEqual([]);
  });
});
