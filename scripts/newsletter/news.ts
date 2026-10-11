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

import { inWindow, collectSource, objectRecord } from './data/source';

import { callAnthropic, DEFAULT_MODEL } from './repetition';
import { parseModelJsonObject } from './model-json';
import { sanitizeForPrompt } from './util/sanitize';
import type { SourceAudit } from './data/source';
import type { Topic } from './topics';

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
    if (parsed.username || parsed.password) return fallback;
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

export function formatWednesdayNewsContext(angle: NewsAngle | null): string {
  if (!angle || !angle.sources.length) {
    return 'No current-event hook was verified from the available headline evidence. Write an evergreen educational article. Say current-event coverage is unavailable; do not claim a quiet week, no events, or that nothing major happened.';
  }
  return [
    `CURRENT ANGLE (editorial interpretation, not independently verified): ${sanitizeForPrompt(angle.angle)}`,
    'These sampled headlines are the only supplied current-event evidence. Restrict claims to what they support; include source links and dates. Do not infer complete coverage or invent additional details.',
    ...angle.sources.map(source => `- ${sanitizeForPrompt(source)}`),
  ].join('\n');
}

export async function fetchHeadlines(onAudit: (audit: SourceAudit) => void = () => {}, now = new Date()): Promise<NewsHeadline[]> {
  const requested = { start: new Date(now.getTime() - 72 * 3_600_000).toISOString(), end: now.toISOString() };
  const result = await collectSource({
    id: 'news-headlines', label: 'Recent headline sample (up to 40; original stories require review)',
    url: NEWS_RSS_URL, requested, unit: 'sampled headlines',
  }, raw => {
    const payload = objectRecord(raw);
    if (payload.status !== 'ok' || !Array.isArray(payload.items)) throw new SyntaxError('Missing headlines');
    const headlines: NewsHeadline[] = [];
    for (const entry of payload.items.slice(0, 40)) {
      try {
        const row = objectRecord(entry);
        if (typeof row.title !== 'string' || !row.title.trim() || typeof row.source !== 'string' ||
            typeof row.timestamp !== 'string' || !inWindow(Date.parse(row.timestamp), requested) ||
            typeof row.url !== 'string' || !/^https?:\/\//.test(row.url)) continue;
        headlines.push({ title: row.title, source: row.source, publishedAt: new Date(row.timestamp).toISOString(), url: row.url,
          description: typeof row.description === 'string' ? row.description : undefined });
      } catch { /* Invalid headlines do not become current-event evidence. */ }
    }
    return {
      data: headlines.length ? headlines : null, records: headlines.length,
      times: headlines.flatMap(h => h.publishedAt ? [h.publishedAt] : []), covered: [],
      status: 'partial', reasons: ['Headline aggregation does not establish original-source coverage; review any current-event claims against linked originals'],
    };
  });
  onAudit(result.audit);
  return result.data ?? [];
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
  const parsed = parseModelJsonObject(raw);
  const angle = typeof parsed.angle === 'string' ? parsed.angle : null;
  if (!angle) return null;
  const indices = Array.isArray(parsed.source_indices) ? (parsed.source_indices as unknown[]) : [];
  const sources = indices
    .map((i) => (typeof i === 'number' && Number.isInteger(i) && i >= 1 && i <= 30 && headlines[i - 1]
      ? `${headlines[i - 1].title} (${headlines[i - 1].url}; ${headlines[i - 1].publishedAt})` : undefined))
    .filter((s): s is string => Boolean(s))
    .slice(0, 5);
  return sources.length ? { angle, sources } : null;
}
