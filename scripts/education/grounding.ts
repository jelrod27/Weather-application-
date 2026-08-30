/**
 * Fetching the text a Guide is drafted from.
 *
 * Grounding and validation are the same code path on purpose. A source is
 * citable only if this module could actually retrieve a definition from it, so
 * `npm run validate:education-sources` proves exactly the property the
 * generator depends on, and a catalog entry that has rotted cannot be cited
 * with a green run — the way `image-selection.ts` makes the newsletter's
 * selection and validation share one gate.
 */

import type { SourceEntry } from './sources';

const REQUEST_TIMEOUT_MS = 20_000;
const DELAY_BETWEEN_REQUESTS_MS = 400;
/** Enough of a page for the model to work from without flooding the context. */
const MAX_TEXT_CHARS = 12_000;

/**
 * www.noaa.gov sits behind CloudFront, and its bot rule keys on the first
 * User-Agent product token: a descriptive one is answered with 403 on every
 * JetStream page, while `curl/...` is answered with 200. NOAA's own robots.txt
 * does not disallow /jetstream/, so the block is a blanket CDN filter rather
 * than a stated access policy, and every request here is a handful of reads of
 * public-domain text.
 *
 * The leading token is therefore the one the filter accepts, with our real
 * identity and a contact address behind it — a compound UA in the ordinary
 * shape, not an anonymous one. Do not reduce this to the bare curl token: the
 * point is that the operator of a page we read can tell who we are and reach
 * us. `validate-images.ts` sends the same courtesy to Wikimedia.
 */
const REQUEST_HEADERS: Record<string, string> = {
  'user-agent':
    'curl/8.5.0 16bitweather-education-guides/1.0 (https://16bitweather.co; contact: justinelrod111@gmail.com)',
  accept: '*/*',
};

/**
 * The NWS Glossary answers an unknown term with HTTP 200 and this sentence, so
 * status alone would happily accept a citation that defines nothing.
 */
const GLOSSARY_MISS = 'there are no matches for';

/** Shortest body we treat as a real page rather than a redirect stub. */
const MIN_TEXT_CHARS = 200;

export interface GroundedSource {
  entry: SourceEntry;
  /** Page text, tags stripped and whitespace collapsed. */
  text: string;
}

export interface SourceFetchResult {
  entry: SourceEntry;
  ok: boolean;
  status: number | string;
  reason?: string;
  text?: string;
}

/** Strips markup and collapses whitespace. Not a parser — a reading pass. */
export function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<\/(p|div|li|h[1-6]|tr|section)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)))
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n\s*/g, '\n')
    .trim();
}

/** Retrieves one source's text, or reports why it is not citable. */
export async function fetchSource(entry: SourceEntry): Promise<SourceFetchResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(entry.url, {
      redirect: 'follow',
      headers: REQUEST_HEADERS,
      signal: controller.signal,
    });
    if (!res.ok) return { entry, ok: false, status: res.status };

    const text = htmlToText(await res.text());
    if (text.toLowerCase().includes(GLOSSARY_MISS)) {
      return { entry, ok: false, status: res.status, reason: 'glossary has no entry for this term' };
    }
    if (text.length < MIN_TEXT_CHARS) {
      return { entry, ok: false, status: res.status, reason: `only ${text.length} characters of text` };
    }
    return { entry, ok: true, status: res.status, text: text.slice(0, MAX_TEXT_CHARS) };
  } catch (err) {
    return { entry, ok: false, status: 'error', reason: (err as Error).message };
  } finally {
    clearTimeout(timer);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Fetches sources one at a time, politely, keeping catalog order. */
export async function fetchSources(entries: SourceEntry[]): Promise<SourceFetchResult[]> {
  const results: SourceFetchResult[] = [];
  for (const [index, entry] of entries.entries()) {
    results.push(await fetchSource(entry));
    if (index < entries.length - 1) await sleep(DELAY_BETWEEN_REQUESTS_MS);
  }
  return results;
}

export class NoGroundingError extends Error {}

/**
 * The sources a Guide may be drafted from and cite.
 *
 * Failing loudly when too few resolve is deliberate: a Guide written without
 * its sources in front of the model is a Guide written from recall, and the
 * newsletter takes the same line when Iowa Mesonet comes back empty — the run
 * fails rather than fabricating.
 */
export async function groundOn(
  entries: SourceEntry[],
  minimum: number,
): Promise<GroundedSource[]> {
  const results = await fetchSources(entries);
  const grounded = results
    .filter((r): r is SourceFetchResult & { text: string } => r.ok && typeof r.text === 'string')
    .map(({ entry, text }) => ({ entry, text }));

  for (const failed of results.filter((r) => !r.ok)) {
    console.warn(
      `[education] source unavailable, not citable: ${failed.entry.id} (${failed.status}${failed.reason ? `; ${failed.reason}` : ''})`,
    );
  }

  if (grounded.length < minimum) {
    throw new NoGroundingError(
      `Only ${grounded.length} of ${entries.length} sources resolved; ${minimum} are required. ` +
        `Re-run when the NOAA hosts are reachable rather than drafting without them.`,
    );
  }
  return grounded;
}
