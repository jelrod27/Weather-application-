import type { BlogPost } from '@/lib/blog';
import {
  computeOpenerHash,
  getKeyPhraseDenyList,
  getOpenerHashes,
  getRecentByCadence,
  getRecentImages,
  getTopicWeeksSinceLastUsed,
  withinLookback,
} from '../../scripts/newsletter/state';

const NOW = new Date('2026-04-26T12:00:00Z');

function daysAgo(n: number): string {
  return new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000).toISOString();
}

function makePost(overrides: Partial<BlogPost>): BlogPost {
  return {
    slug: 'fixture',
    title: 'Fixture',
    date: NOW.toISOString(),
    author: '16bitbot',
    summary: '',
    tags: [],
    heroImage: '',
    readTime: 1,
    content: 'Body content.',
    ...overrides,
  };
}

describe('withinLookback', () => {
  it('keeps posts within the window and drops older ones', () => {
    const posts = [
      makePost({ slug: 'fresh', date: daysAgo(7) }),
      makePost({ slug: 'edge', date: daysAgo(83) }),
      makePost({ slug: 'stale', date: daysAgo(120) }),
    ];
    const result = withinLookback(posts, 12, NOW);
    const slugs = result.map((p) => p.slug);
    expect(slugs).toEqual(expect.arrayContaining(['fresh', 'edge']));
    expect(slugs).not.toContain('stale');
  });

  it('drops posts with non-parseable dates', () => {
    const posts = [makePost({ slug: 'bad', date: 'not a date' })];
    expect(withinLookback(posts, 12, NOW)).toEqual([]);
  });
});

describe('getRecentByCadence', () => {
  it('filters by cadence and lookback', () => {
    const posts = [
      makePost({ slug: 'wed1', cadence: 'wednesday_topic', date: daysAgo(7) }),
      makePost({ slug: 'sun1', cadence: 'sunday_rearview', date: daysAgo(7) }),
      makePost({ slug: 'wed-old', cadence: 'wednesday_topic', date: daysAgo(120) }),
    ];
    const wed = getRecentByCadence(posts, 'wednesday_topic', 12, NOW);
    expect(wed.map((p) => p.slug)).toEqual(['wed1']);
    const sun = getRecentByCadence(posts, 'sunday_rearview', 12, NOW);
    expect(sun.map((p) => p.slug)).toEqual(['sun1']);
  });

  it('ignores posts missing a cadence field', () => {
    const posts = [
      makePost({ slug: 'legacy', date: daysAgo(7) }),
      makePost({ slug: 'tagged', cadence: 'wednesday_topic', date: daysAgo(7) }),
    ];
    expect(getRecentByCadence(posts, 'wednesday_topic', 12, NOW)).toHaveLength(1);
  });
});

describe('getKeyPhraseDenyList', () => {
  it('aggregates and deduplicates key phrases across recent same-cadence posts', () => {
    const posts = [
      makePost({
        slug: 'a',
        cadence: 'wednesday_topic',
        date: daysAgo(7),
        key_phrases: ['Sulfate Aerosol', 'VAAC bulletin', 'tropospheric cooling'],
      }),
      makePost({
        slug: 'b',
        cadence: 'wednesday_topic',
        date: daysAgo(14),
        key_phrases: ['sulfate aerosol', 'plume height'],
      }),
      makePost({
        slug: 'c',
        cadence: 'sunday_rearview',
        date: daysAgo(7),
        key_phrases: ['rearview-only-phrase'],
      }),
    ];
    const denyList = getKeyPhraseDenyList(posts, 'wednesday_topic', 12, NOW);
    expect(denyList).toEqual(
      expect.arrayContaining(['sulfate aerosol', 'vaac bulletin', 'tropospheric cooling', 'plume height']),
    );
    expect(denyList).not.toContain('rearview-only-phrase');
    // Deduped despite case difference.
    expect(denyList.filter((p) => p === 'sulfate aerosol')).toHaveLength(1);
  });

  it('returns empty array when no recent posts exist', () => {
    expect(getKeyPhraseDenyList([], 'wednesday_topic', 12, NOW)).toEqual([]);
  });
});

describe('getOpenerHashes', () => {
  it('collects hashes from same-cadence recent posts', () => {
    const posts = [
      makePost({ slug: 'a', cadence: 'wednesday_topic', date: daysAgo(7), opener_hash: 'aaaa1111' }),
      makePost({ slug: 'b', cadence: 'wednesday_topic', date: daysAgo(14), opener_hash: 'bbbb2222' }),
      makePost({ slug: 'c', cadence: 'sunday_rearview', date: daysAgo(7), opener_hash: 'cccc3333' }),
    ];
    const hashes = getOpenerHashes(posts, 'wednesday_topic', 12, NOW);
    expect(hashes).toEqual(expect.arrayContaining(['aaaa1111', 'bbbb2222']));
    expect(hashes).not.toContain('cccc3333');
  });
});

describe('getRecentImages', () => {
  it('collects image IDs across cadences within the 8-week reuse window', () => {
    const posts = [
      makePost({ slug: 'a', date: daysAgo(7), images_used: ['noaa-1.jpg', 'usgs-1.jpg'] }),
      makePost({ slug: 'b', date: daysAgo(40), images_used: ['noaa-2.jpg'] }),
      makePost({ slug: 'c', date: daysAgo(70), images_used: ['noaa-3.jpg'] }),
    ];
    const recent = getRecentImages(posts, 8, NOW);
    expect(recent).toEqual(expect.arrayContaining(['noaa-1.jpg', 'usgs-1.jpg', 'noaa-2.jpg']));
    expect(recent).not.toContain('noaa-3.jpg');
  });

  it('honors a custom window', () => {
    const posts = [makePost({ slug: 'a', date: daysAgo(20), images_used: ['x.jpg'] })];
    expect(getRecentImages(posts, 1, NOW)).toEqual([]);
    expect(getRecentImages(posts, 4, NOW)).toEqual(['x.jpg']);
  });
});

describe('getTopicWeeksSinceLastUsed', () => {
  it('returns NEVER_USED_SCORE for topics with no recent post', () => {
    const map = getTopicWeeksSinceLastUsed([], 12, NOW);
    expect(map.get('volcanoes')).toBe(99);
    expect(map.get('paleoclimate')).toBe(99);
    expect(map.size).toBe(16);
  });

  it('records weeks-ago for topics seen in the window', () => {
    const posts = [
      makePost({
        slug: 'v',
        cadence: 'wednesday_topic',
        date: daysAgo(14),
        topic_slug: 'volcanoes',
      }),
    ];
    const map = getTopicWeeksSinceLastUsed(posts, 12, NOW);
    expect(map.get('volcanoes')).toBe(2);
  });

  it('takes the most recent occurrence when a topic was used multiple times', () => {
    const posts = [
      makePost({ slug: 'old', cadence: 'wednesday_topic', date: daysAgo(35), topic_slug: 'volcanoes' }),
      makePost({ slug: 'new', cadence: 'wednesday_topic', date: daysAgo(7), topic_slug: 'volcanoes' }),
    ];
    const map = getTopicWeeksSinceLastUsed(posts, 12, NOW);
    expect(map.get('volcanoes')).toBe(1);
  });

  it('ignores Sunday posts even if they have a topic_slug', () => {
    const posts = [
      makePost({
        slug: 's',
        cadence: 'sunday_rearview',
        date: daysAgo(7),
        topic_slug: 'volcanoes',
      }),
    ];
    expect(getTopicWeeksSinceLastUsed(posts, 12, NOW).get('volcanoes')).toBe(99);
  });

  it('ignores unknown topic slugs gracefully', () => {
    const posts = [
      makePost({
        slug: 'x',
        cadence: 'wednesday_topic',
        date: daysAgo(7),
        topic_slug: 'not-a-real-topic',
      }),
    ];
    const map = getTopicWeeksSinceLastUsed(posts, 12, NOW);
    expect(map.get('volcanoes')).toBe(99);
  });
});

describe('computeOpenerHash', () => {
  it('produces a stable 8-char hex hash', () => {
    const hash = computeOpenerHash('The storm rolled in across the plains tonight.');
    expect(hash).toMatch(/^[0-9a-f]{8}$/);
  });

  it('is case-insensitive', () => {
    const a = computeOpenerHash('The Storm Rolled In Across The Plains Tonight.');
    const b = computeOpenerHash('the storm rolled in across the plains tonight.');
    expect(a).toBe(b);
  });

  it('strips stopwords so determiners do not change the hash', () => {
    const a = computeOpenerHash('The storm rolled across the plains tonight at high speed reaching peaks.');
    const b = computeOpenerHash('A storm rolled across the plains tonight at high speed reaching peaks.');
    expect(a).toBe(b);
  });

  it('strips frontmatter before hashing', () => {
    const withMatter = `---
title: x
---

Storm rolled across the plains tonight at high speed reaching peaks.`;
    const without = `Storm rolled across the plains tonight at high speed reaching peaks.`;
    expect(computeOpenerHash(withMatter)).toBe(computeOpenerHash(without));
  });

  it('strips leading H1/H2 headings before hashing', () => {
    const withHeading = `# Big Title

Storm rolled across the plains tonight at high speed reaching peaks of intensity.`;
    const without = `Storm rolled across the plains tonight at high speed reaching peaks of intensity.`;
    expect(computeOpenerHash(withHeading)).toBe(computeOpenerHash(without));
  });

  it('strips images and code fences before hashing', () => {
    const cluttered = `![alt](http://example.com/img.jpg)

\`\`\`
console.log("noise")
\`\`\`

Storm rolled across the plains tonight at high speed reaching peaks of intensity.`;
    const clean = `Storm rolled across the plains tonight at high speed reaching peaks of intensity.`;
    expect(computeOpenerHash(cluttered)).toBe(computeOpenerHash(clean));
  });

  it('produces different hashes for different content', () => {
    const a = computeOpenerHash('Volcanic ash plume reached the stratosphere this week over Iceland disrupting flights.');
    const b = computeOpenerHash('Atmospheric river battered the Pacific Northwest with two feet of snow over three days.');
    expect(a).not.toBe(b);
  });
});
