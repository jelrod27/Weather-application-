/**
 * @jest-environment node
 *
 * The similarity judge returns one scored entry with a reason for every
 * prior post in the lookback window, plus trigger phrases. With a flat
 * maxTokens of 1500 the 2026-09-06 Sunday run was cut off, the wrapper
 * threw, and the pipeline silently fell back to a similarity of 0. The
 * output room has to scale with how many prior posts are being scored.
 */
import type { BlogPost } from '../../lib/blog/index';
import { judgeSimilarity } from '../../scripts/newsletter/repetition';

function makePosts(count: number): BlogPost[] {
  return Array.from({ length: count }, (_, i) => ({
    slug: `this-week-in-weather-2026-0${(i % 9) + 1}-0${(i % 9) + 1}`,
    title: `This Week in Weather ${i}`,
    date: '2026-08-30T12:00:00.000Z',
    author: '16bitbot',
    summary: 'summary',
    tags: ['weekly-recap'],
    heroImage: '/x.png',
    readTime: 5,
    content: 'A quiet week across the Plains with a trough digging into the northern Rockies.',
    cadence: 'sunday_rearview',
    key_phrases: ['quiet week', 'trough digging'],
  }));
}

describe('judgeSimilarity output room', () => {
  const originalFetch = global.fetch;
  const originalKey = process.env.ANTHROPIC_API_KEY;
  const requestBodies: Array<{ max_tokens: number }> = [];

  beforeEach(() => {
    requestBodies.length = 0;
    process.env.ANTHROPIC_API_KEY = 'test-key';
    global.fetch = jest.fn(async (_url: unknown, init?: { body?: string }) => {
      requestBodies.push(JSON.parse(init?.body ?? '{}'));
      return {
        ok: true,
        json: async () => ({
          stop_reason: 'end_turn',
          content: [{ type: 'text', text: '{"scores":[],"max":0,"trigger_phrases":[]}' }],
        }),
      };
    }) as unknown as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env.ANTHROPIC_API_KEY = originalKey;
  });

  it('gives a full twelve-week lookback more room than the 1500 tokens that got cut off', async () => {
    await judgeSimilarity('new draft', makePosts(12));

    expect(requestBodies[0].max_tokens).toBeGreaterThan(1500);
  });

  it('asks for more room as the number of prior posts grows', async () => {
    await judgeSimilarity('new draft', makePosts(12));
    await judgeSimilarity('new draft', makePosts(2));

    expect(requestBodies[0].max_tokens).toBeGreaterThan(requestBodies[1].max_tokens);
  });

  it('never drops below the room a small lookback already had', async () => {
    await judgeSimilarity('new draft', makePosts(1));

    expect(requestBodies[0].max_tokens).toBeGreaterThanOrEqual(1500);
  });
});
