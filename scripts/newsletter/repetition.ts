import type { BlogPost } from '@/lib/blog';
import { parseModelJsonArray, parseModelJsonObject } from './model-json';

export const DEFAULT_MODEL = process.env.NEWSLETTER_MODEL || 'claude-sonnet-4-6';
const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';
const REQUEST_TIMEOUT_MS = 120_000;

export interface AnthropicCacheBlock {
  type: 'text';
  text: string;
  cache_control?: { type: 'ephemeral' };
}

export interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string | AnthropicCacheBlock[];
}

export interface CallAnthropicOptions {
  model?: string;
  systemBlocks?: AnthropicCacheBlock[];
  messages: AnthropicMessage[];
  maxTokens?: number;
  temperature?: number;
}

/**
 * Thin wrapper around the Anthropic Messages REST API with prompt caching
 * support. Static system blocks (voice spec, topic catalog) should set
 * cache_control to ephemeral so they survive the up-to-3 retries within
 * one run cheaply.
 *
 * Throws on non-200 responses with body text included so callers can
 * distinguish 429 (rate-limit) from 400 (bad request).
 */
export async function callAnthropic(opts: CallAnthropicOptions): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set');

  const body: Record<string, unknown> = {
    model: opts.model ?? DEFAULT_MODEL,
    max_tokens: opts.maxTokens ?? 2048,
    temperature: opts.temperature ?? 0,
    messages: opts.messages,
  };
  if (opts.systemBlocks && opts.systemBlocks.length > 0) {
    body.system = opts.systemBlocks;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(ANTHROPIC_API, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Anthropic API ${res.status}: ${text.slice(0, 500)}`);
  }
  const data = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
  const block = data.content?.find((b) => b.type === 'text');
  return block?.text ?? '';
}

/**
 * Asks the model to extract its own 5-10 most distinctive phrases from a
 * draft. These get added to the deny-list for future runs of the same
 * cadence so the model can see and avoid its own prior framing.
 */
export async function extractKeyPhrases(markdown: string): Promise<string[]> {
  const prompt = `Extract 5 to 10 distinctive phrases or framings from the post below. Distinctive means specific to THIS post — not generic weather vocabulary. Examples of distinctive: "polar vortex hangover", "dryline punch through Texas". Examples of not distinctive: "the storm", "rain expected".

Return a JSON array of strings only. No prose, no markdown fences.

Post:
${markdown}`;

  const raw = await callAnthropic({
    messages: [{ role: 'user', content: prompt }],
    maxTokens: 800,
    temperature: 0,
  });
  return parseJsonArray(raw);
}

export interface SimilarityVerdict {
  max: number;
  worstMatch: { slug: string; score: number; reason: string } | null;
  triggerPhrases: string[];
}

/**
 * Anthropic-as-judge similarity check. Pass each prior post's title +
 * first 200 words + key_phrases plus the new draft. Model returns per-post
 * scores 0-1, the highest match's reason, and any specific phrases or
 * framings that triggered the overlap (those feed back into the deny-list).
 *
 * Returns max=0, worstMatch=null when no prior posts exist.
 */
export async function judgeSimilarity(
  draft: string,
  priorPosts: BlogPost[],
): Promise<SimilarityVerdict> {
  if (priorPosts.length === 0) {
    return { max: 0, worstMatch: null, triggerPhrases: [] };
  }

  const priorBlock = priorPosts
    .map((post) => {
      const opening = post.content.split(/\s+/).slice(0, 200).join(' ');
      const phrases = post.key_phrases?.join(', ') ?? '';
      return `### ${post.slug}\nTitle: ${post.title}\nOpening: ${opening}\nKey phrases: ${phrases}`;
    })
    .join('\n\n');

  const prompt = `You are a similarity judge for a weather and earth-science publication. Below are recent prior posts and a new draft. Score how much the new draft overlaps each prior post in framing, voice, structure, and angle — not topic alone. Two posts about volcanoes can be very different if they take different angles.

Score each on a 0.0 to 1.0 scale where:
- 0.0 = completely distinct
- 0.5 = some shared phrasing or framing
- 0.85 = uncomfortably close, would feel repetitive to a regular reader
- 1.0 = near-duplicate

Return JSON only, with this exact shape:
{
  "scores": [{"slug": "...", "score": 0.0, "reason": "..."}],
  "max": 0.0,
  "worst_slug": "...",
  "trigger_phrases": ["...", "..."]
}

trigger_phrases should list specific phrases or framings from the new draft that drove the highest overlap, so the writer can avoid them on a retry.

PRIOR POSTS:
${priorBlock}

NEW DRAFT:
${draft}`;

  const raw = await callAnthropic({
    messages: [{ role: 'user', content: prompt }],
    maxTokens: 1500,
    temperature: 0,
  });

  const parsed = parseJsonObject(raw) as {
    scores?: Array<{ slug: string; score: number; reason: string }>;
    max?: number;
    worst_slug?: string;
    trigger_phrases?: string[];
  };
  const scores = parsed.scores ?? [];
  // Defensive: take the larger of the model's reported `max` and what we
  // can derive from `scores`. Models occasionally report inconsistent
  // values; we'd rather over-flag than miss a near-duplicate.
  const reportedMax = typeof parsed.max === 'number' ? parsed.max : 0;
  const derivedMax = scores.reduce(
    (m, s) => (typeof s.score === 'number' && s.score > m ? s.score : m),
    0,
  );
  const max = Math.max(reportedMax, derivedMax);
  const worstSlug = parsed.worst_slug;
  const worstEntry =
    scores.find((s) => s.slug === worstSlug) ??
    scores.reduce<(typeof scores)[number] | undefined>(
      (best, s) => (!best || s.score > best.score ? s : best),
      undefined,
    );
  return {
    max,
    worstMatch: worstEntry
      ? { slug: worstEntry.slug, score: worstEntry.score, reason: worstEntry.reason }
      : null,
    triggerPhrases: parsed.trigger_phrases ?? [],
  };
}

export function checkOpenerCollision(currentHash: string, priorHashes: string[]): boolean {
  return priorHashes.includes(currentHash);
}

const parseJsonArray = parseModelJsonArray;
const parseJsonObject = parseModelJsonObject;
