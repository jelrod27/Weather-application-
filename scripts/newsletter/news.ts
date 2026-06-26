/**
 * Current-news angle finder for Wednesday topic posts.
 *
 * Strategy:
 * 1. Pull aggregated headlines from production /api/news/rss.
 * 2. Ask Sonnet to identify the strongest news angle for the chosen
 *    topic. If nothing fits, return null and the post leans evergreen.
 *
 * Failure here is non-fatal — we'd rather ship an evergreen post than
 * fail the entire run because the news API hiccupped.
 */

import { callAnthropic, DEFAULT_MODEL } from './repetition';
import type { Topic } from './topics';
import { sanitizeForPrompt } from './util/sanitize';

const ALLOWED_NEWS_HOSTS: ReadonlySet<string> = new Set([
  'www.16bitweather.co',
  '16bitweather.co',
  'localhost',
  '127.0.0.1',
]);

function resolveNewsRssUrl(): string {
  const fallback = 'https://www.16bitweather.co/api/news/rss?maxItems=40&maxAge=72';
  const override = process.env.NEWSLETTER_NEWS_URL?.trim();
  if (!override) return fallback;
  try {
    const parsed = new URL(override);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      console.warn(`[news] NEWSLETTER_NEWS_URL has unsupported scheme ${parsed.protocol}; using default`);
      return fallback;
    }
    if (!ALLOWED_NEWS_HOSTS.has(parsed.hostname.toLowerCase())) {
      console.warn(`[news] NEWSLETTER_NEWS_URL host ${parsed.hostname} not in allow-list; using default`);
      return fallback;
    }
    return override;
  } catch {
    console.warn('[news] NEWSLETTER_NEWS_URL is not a valid URL; using default');
    return fallback;
  }
}

const NEWS_RSS_URL = resolveNewsRssUrl();
const FETCH_TIMEOUT_MS = 12_000;

export interface NewsHeadline {
  title: string;
  source: string;
  publishedAt?: string;
  url?: string;
  description?: string;
}

export interface NewsAngle {
  angle: string;
  sources: string[];
}

export async function fetchHeadlines(): Promise<NewsHeadline[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(NEWS_RSS_URL, { signal: controller.signal });
    if (!res.ok) {
      console.warn(`[news] rss ${res.status}; continuing without news`);
      return [];
    }
    const data = (await res.json()) as { items?: unknown };
    const list = Array.isArray(data?.items) ? data.items : [];
    return list.map((entry) => {
      const item = entry as {
        title?: string;
        source?: string;
        timestamp?: string;
        url?: string;
        description?: string;
      };
      return {
        title: item.title ?? '',
        source: item.source ?? 'Unknown',
        publishedAt: item.timestamp,
        url: item.url,
        description: item.description,
      };
    }).filter((headline) => headline.title.length > 0);
  } catch (err) {
    console.warn(`[news] fetch failed: ${(err as Error).message}; continuing without news`);
    return [];
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Returns the strongest news angle for the given topic, or null if no
 * recent headline plausibly connects. Single Sonnet call, low temperature,
 * structured JSON output.
 */
export async function findAngleForTopic(
  topic: Topic,
  headlines: NewsHeadline[],
): Promise<NewsAngle | null> {
  if (headlines.length === 0) return null;

  const headlineBlock = headlines
    .slice(0, 30)
    .map((h, i) => {
      const title = sanitizeForPrompt(h.title);
      const desc = h.description ? sanitizeForPrompt(h.description).slice(0, 200) : '';
      const source = sanitizeForPrompt(h.source);
      return `${i + 1}. [${source}] ${title}${desc ? ` — ${desc}` : ''}`;
    })
    .join('\n');

  const prompt = `You are scouting current-event hooks for a weather and earth-science publication.

TOPIC: ${topic.title}
TOPIC SCOPE: ${topic.description}
TOPIC KEYWORDS: ${topic.keywords.join(', ')}

Below are recent news headlines. Identify whether any plausibly connect to the topic above. A connection is plausible if the headline is about the same physical phenomenon, a major event of that type, ongoing research, or a directly relevant policy/economic impact.

If at least one headline connects, return a JSON object:
{
  "angle": "one or two sentence framing the writer can use",
  "source_indices": [1, 5, 12]
}

If no headline plausibly connects, return:
{
  "angle": null,
  "source_indices": []
}

Headlines:
${headlineBlock}

Return JSON only, no prose.`;

  const raw = await callAnthropic({
    model: DEFAULT_MODEL,
    messages: [{ role: 'user', content: prompt }],
    maxTokens: 600,
    temperature: 0.2,
  });

  const parsed = parseAngle(raw, headlines);
  if (!parsed) return null;
  return parsed;
}

function parseAngle(raw: string, headlines: NewsHeadline[]): NewsAngle | null {
  const trimmed = raw.trim();
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  const body = fenceMatch ? fenceMatch[1].trim() : trimmed;
  try {
    const parsed = JSON.parse(body) as { angle?: unknown; source_indices?: unknown };
    const angle = typeof parsed.angle === 'string' ? parsed.angle : null;
    if (!angle) return null;
    const indices = Array.isArray(parsed.source_indices) ? (parsed.source_indices as unknown[]) : [];
    const sources = indices
      .map((i) => (typeof i === 'number' ? headlines[i - 1]?.title : undefined))
      .filter((s): s is string => Boolean(s))
      .slice(0, 5);
    return { angle, sources };
  } catch {
    return null;
  }
}
