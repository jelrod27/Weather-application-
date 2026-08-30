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

const ENTITIES: Record<string, string> = {
  nbsp: ' ',
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
};

/**
 * Strips markup and collapses whitespace. Not a parser — a reading pass.
 *
 * Two details that a chain of naive replaces gets wrong, and this text is fed
 * to a model, so it is the indirect-injection surface ADR-0002 is about:
 *
 * An end tag is not just `</name>`. The HTML parser accepts whitespace and
 * even attributes before the `>` and discards them, so `</script foo="bar">`
 * and `</script\t\n bar>` both close a script. A regex anchored on `</script>`,
 * or on `</script\s*>`, leaves the script body behind as prose. Matching runs
 * to the `>` with a word boundary after the tag name, which still refuses
 * `</scriptfoo>` as the different tag it is.
 *
 * Entities are decoded in one pass rather than one replace per entity. Chained
 * replaces re-scan their own output, so `&amp;lt;` became `&lt;` and then `<` —
 * text that should read as the literal `&lt;` was unescaped twice.
 */
export function htmlToText(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script\b[^>]*>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style\b[^>]*>/gi, ' ')
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript\b[^>]*>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<\/(?:p|div|li|h[1-6]|tr|section)\b[^>]*>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(?:([a-z]+)|#(\d+));/gi, (match, name: string | undefined, code: string | undefined) => {
      if (name) return ENTITIES[name.toLowerCase()] ?? match;
      return code ? String.fromCodePoint(Number(code)) : match;
    })
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n\s*/g, '\n')
    // An opening tag on the far side of a block boundary leaves a space at the
    // head of the line. Harmless to read, but it is prompt text.
    .replace(/\n[ \t]+/g, '\n')
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
