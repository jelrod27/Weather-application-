import {
  IMAGES,
  countImagesByTopic,
  getActiveTopics,
  selectImages,
  type ImageEntry,
} from '../../scripts/newsletter/images';
import { TOPIC_SLUGS } from '../../scripts/newsletter/topics';

describe('IMAGES catalog', () => {
  it('contains at least 50 entries', () => {
    expect(IMAGES.length).toBeGreaterThanOrEqual(50);
  });

  it('every topic has at least 3 entries', () => {
    const counts = countImagesByTopic();
    for (const slug of TOPIC_SLUGS) {
      expect(counts[slug]).toBeGreaterThanOrEqual(3);
    }
  });

  it('every entry has a unique id', () => {
    const ids = new Set(IMAGES.map((i) => i.id));
    expect(ids.size).toBe(IMAGES.length);
  });

  it('every entry has a non-empty url, caption, credit', () => {
    for (const img of IMAGES) {
      expect(img.url.length).toBeGreaterThan(0);
      expect(img.caption.length).toBeGreaterThan(0);
      expect(img.credit.length).toBeGreaterThan(0);
    }
  });

  it('every entry uses an HTTPS URL', () => {
    for (const img of IMAGES) {
      expect(img.url.startsWith('https://')).toBe(true);
    }
  });

  it('every license is one of the allowed public-use values', () => {
    const allowed = new Set(['PD-USGov', 'PD', 'CC0', 'CC-BY-4.0']);
    for (const img of IMAGES) {
      expect(allowed.has(img.license)).toBe(true);
    }
  });

  it('every topic_tag references a real topic slug', () => {
    const validSlugs = new Set<string>(TOPIC_SLUGS);
    for (const img of IMAGES) {
      expect(img.topic_tags.length).toBeGreaterThan(0);
      for (const tag of img.topic_tags) {
        expect(validSlugs.has(tag)).toBe(true);
      }
    }
  });
});

describe('selectImages', () => {
  it('returns the requested count when the topic pool is sufficient', () => {
    const picked = selectImages({
      topic: 'severe_storms',
      count: 3,
      excludeIds: new Set(),
      rng: () => 0,
    });
    expect(picked).toHaveLength(3);
  });

  it('produces unique images within a single selection', () => {
    const picked = selectImages({
      topic: 'space_weather',
      count: 3,
      excludeIds: new Set(),
      rng: () => 0,
    });
    const ids = new Set(picked.map((p) => p.id));
    expect(ids.size).toBe(picked.length);
  });

  it('respects the exclusion set', () => {
    const ids = IMAGES.filter((i) => i.topic_tags.includes('severe_storms')).map((i) => i.id);
    expect(ids.length).toBeGreaterThanOrEqual(3);
    const excludeIds = new Set(ids.slice(0, ids.length - 2));
    const picked = selectImages({
      topic: 'severe_storms',
      count: 2,
      excludeIds,
      rng: () => 0,
    });
    for (const p of picked) {
      expect(excludeIds.has(p.id)).toBe(false);
    }
  });

  it('falls back to neighboring topics when the primary pool is starved', () => {
    const primary: ImageEntry[] = IMAGES.filter((i) => i.topic_tags.includes('paleoclimate'));
    expect(primary.length).toBeGreaterThanOrEqual(3);
    // Exclude every primary image. Selection must reach for neighbors.
    const excludeIds = new Set(primary.map((p) => p.id));
    const picked = selectImages({
      topic: 'paleoclimate',
      count: 2,
      excludeIds,
      rng: () => 0,
    });
    expect(picked).toHaveLength(2);
    for (const p of picked) {
      expect(excludeIds.has(p.id)).toBe(false);
    }
  });

  it('throws when neither primary nor neighbor pools can satisfy the count', () => {
    const excludeIds = new Set(IMAGES.map((i) => i.id));
    expect(() =>
      selectImages({
        topic: 'volcanoes',
        count: 2,
        excludeIds,
        rng: () => 0,
      }),
    ).toThrow(/catalog could not satisfy/);
  });

  it('can return partial relevant picks when requested', () => {
    const severeIds = IMAGES.filter((i) => i.topic_tags.includes('severe_storms')).map((i) => i.id);
    const keep = severeIds[0];
    const excludeIds = new Set(IMAGES.map((i) => i.id).filter((id) => id !== keep));
    const picked = selectImages({
      topic: 'severe_storms',
      count: 3,
      excludeIds,
      allowPartial: true,
      rng: () => 0,
    });
    expect(picked.map((p) => p.id)).toEqual([keep]);
  });

  it('excludes tropical from active topics outside hurricane season', () => {
    // April — not hurricane season — and no severe/space data signals.
    const active = getActiveTopics({
      severeReportCount: 0,
      maxKpPastWeek: 0,
      notableFlareCount: 0,
      significantQuakeCount: 0,
      now: new Date('2026-04-26T12:00:00Z'),
    });
    expect(active.has('tropical')).toBe(false);
    // Only forecast-analysis topics should always be allowed.
    expect(active.has('atmosphere_layers')).toBe(true);
    expect(active.has('tech_and_models')).toBe(true);
    expect(active.has('marine')).toBe(false);
    expect(active.has('agricultural')).toBe(false);
  });

  it('includes tropical during hurricane season', () => {
    const active = getActiveTopics({
      severeReportCount: 0,
      maxKpPastWeek: 0,
      notableFlareCount: 0,
      significantQuakeCount: 0,
      now: new Date('2026-09-15T12:00:00Z'),
    });
    expect(active.has('tropical')).toBe(true);
  });

  it('gates severe_storms behind real report counts', () => {
    const quiet = getActiveTopics({
      severeReportCount: 0,
      maxKpPastWeek: 0,
      notableFlareCount: 0,
      significantQuakeCount: 0,
      now: new Date('2026-04-26T12:00:00Z'),
    });
    expect(quiet.has('severe_storms')).toBe(false);

    const active = getActiveTopics({
      severeReportCount: 47,
      maxKpPastWeek: 0,
      notableFlareCount: 0,
      significantQuakeCount: 0,
      now: new Date('2026-04-26T12:00:00Z'),
    });
    expect(active.has('severe_storms')).toBe(true);
  });

  it('gates earthquakes behind significant quake counts', () => {
    const quiet = getActiveTopics({
      severeReportCount: 0,
      maxKpPastWeek: 0,
      notableFlareCount: 0,
      significantQuakeCount: 0,
      now: new Date('2026-04-26T12:00:00Z'),
    });
    expect(quiet.has('earthquakes')).toBe(false);

    const active = getActiveTopics({
      severeReportCount: 0,
      maxKpPastWeek: 0,
      notableFlareCount: 0,
      significantQuakeCount: 1,
      now: new Date('2026-04-26T12:00:00Z'),
    });
    expect(active.has('earthquakes')).toBe(true);
  });

  it('gates space_weather on Kp >= 4 OR operationally notable flares', () => {
    const quiet = getActiveTopics({
      severeReportCount: 0,
      maxKpPastWeek: 2,
      notableFlareCount: 0,
      significantQuakeCount: 0,
      now: new Date('2026-04-26T12:00:00Z'),
    });
    expect(quiet.has('space_weather')).toBe(false);

    const cClassOnly = getActiveTopics({
      severeReportCount: 0,
      maxKpPastWeek: 0,
      notableFlareCount: 0,
      significantQuakeCount: 0,
      now: new Date('2026-04-26T12:00:00Z'),
    });
    expect(cClassOnly.has('space_weather')).toBe(false);

    const notableFlare = getActiveTopics({
      severeReportCount: 0,
      maxKpPastWeek: 0,
      notableFlareCount: 1,
      significantQuakeCount: 0,
      now: new Date('2026-04-26T12:00:00Z'),
    });
    expect(notableFlare.has('space_weather')).toBe(true);

    const stormy = getActiveTopics({
      severeReportCount: 0,
      maxKpPastWeek: 5,
      notableFlareCount: 0,
      significantQuakeCount: 0,
      now: new Date('2026-04-26T12:00:00Z'),
    });
    expect(stormy.has('space_weather')).toBe(true);
  });

  it('produces different orderings across rng seeds', () => {
    const seedRng = (seed: number) => {
      let s = seed;
      return () => {
        s = (s * 9301 + 49297) % 233280;
        return s / 233280;
      };
    };
    const a = selectImages({
      topic: 'tropical',
      count: 3,
      excludeIds: new Set(),
      rng: seedRng(1),
    });
    const b = selectImages({
      topic: 'tropical',
      count: 3,
      excludeIds: new Set(),
      rng: seedRng(99),
    });
    // The two seeds should produce at least one differing pick across the trio.
    const sameOrder = a.every((p, i) => p.id === b[i].id);
    expect(sameOrder).toBe(false);
  });
});
