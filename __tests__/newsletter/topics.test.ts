import { TOPICS, TOPIC_SLUGS, selectTopic, type TopicSlug } from '../../scripts/newsletter/topics';

describe('TOPICS catalog', () => {
  it('contains exactly 16 entries', () => {
    expect(TOPIC_SLUGS).toHaveLength(16);
    expect(Object.keys(TOPICS)).toHaveLength(16);
  });

  it('has unique slugs', () => {
    const set = new Set(TOPIC_SLUGS);
    expect(set.size).toBe(TOPIC_SLUGS.length);
  });

  it('every entry has a non-empty title and matching slug', () => {
    for (const slug of TOPIC_SLUGS) {
      expect(TOPICS[slug].slug).toBe(slug);
      expect(TOPICS[slug].title.length).toBeGreaterThan(0);
    }
  });

  it('every description has at least 3 sentences', () => {
    const sentenceCount = (text: string) => text.match(/[.!?](\s|$)/g)?.length ?? 0;
    for (const slug of TOPIC_SLUGS) {
      const sentences = sentenceCount(TOPICS[slug].description);
      expect(sentences).toBeGreaterThanOrEqual(3);
    }
  });

  it('every entry has at least 5 keywords', () => {
    for (const slug of TOPIC_SLUGS) {
      expect(TOPICS[slug].keywords.length).toBeGreaterThanOrEqual(5);
    }
  });
});

describe('selectTopic', () => {
  it('selects from the full pool when no history exists', () => {
    const result = selectTopic(new Map(), () => 0);
    expect(TOPIC_SLUGS).toContain(result.topic.slug);
    expect(result.candidates).toHaveLength(16);
    expect(result.rationale).toMatch(/never used/i);
  });

  it('weighs heavily toward unused topics', () => {
    // All topics used 1 week ago except 'paleoclimate' which is unused.
    const history = new Map<TopicSlug, number>(
      TOPIC_SLUGS.filter((s) => s !== 'paleoclimate').map((s) => [s, 1] as const),
    );
    // rng=0 → picks the highest-scored top-5 candidate first (paleoclimate at 99).
    const result = selectTopic(history, () => 0);
    expect(result.topic.slug).toBe('paleoclimate');
  });

  it('only picks from top 5 by score', () => {
    // Topic at index 0 used 11 weeks ago (score 11), all others used 1 week ago.
    // Top 5 = [topic0 (11), then four arbitrary at score 1].
    const [first, ...rest] = TOPIC_SLUGS;
    const history = new Map<TopicSlug, number>([
      [first, 11] as const,
      ...rest.map((s) => [s, 1] as const),
    ]);
    // Run many trials with random rng — every pick must be in top-5.
    const seen = new Set<TopicSlug>();
    let rngSeed = 0;
    const rng = () => {
      rngSeed = (rngSeed * 9301 + 49297) % 233280;
      return rngSeed / 233280;
    };
    for (let i = 0; i < 200; i++) {
      const result = selectTopic(history, rng);
      seen.add(result.topic.slug);
    }
    // No pick can come from outside the top-5 by score.
    expect(seen.size).toBeLessThanOrEqual(5);
    expect(seen.has(first)).toBe(true);
  });

  it('returns a rationale string and candidate scores', () => {
    const result = selectTopic(new Map([['volcanoes', 4]]), () => 0);
    expect(result.rationale).toMatch(/Selected/);
    expect(result.candidates.length).toBe(16);
    expect(result.candidates[0].score).toBeGreaterThanOrEqual(result.candidates[1].score);
  });
});
