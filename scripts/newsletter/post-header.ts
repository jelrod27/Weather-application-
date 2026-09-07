/**
 * Title, summary and theme text for a generated post.
 *
 * The model does not return a title, so the pipeline derives one from the
 * draft's opening. The first version did that with raw `.slice()` calls and
 * shipped twelve titles that stop mid-word — "Two volcanoes on U.S",
 * "Paleoclimate: In 1989, a Soviet drill team at Vostok Station in ". Two
 * separate bugs produced those:
 *
 *   1. sentence detection split on any period followed by a space, so
 *      "Two volcanoes on U.S. soil are…" became the one-clause theme
 *      "Two volcanoes on U.S." — which is also why that post's summary is 21
 *      characters long;
 *   2. the title then cut that theme to a fixed character count with no regard
 *      for word boundaries or trailing function words.
 *
 * Everything here is pure so `__tests__/newsletter/post-header.test.ts` can
 * exercise it without running the CLI entrypoint.
 */

import { clampDescription } from '@/lib/seo/clamp-description';

/** Google truncates titles past roughly this width. */
export const MAX_TITLE_LENGTH = 60;

/** Below this, a title suffix is noise — use the topic title alone. */
const MIN_TITLE_PHRASE_LENGTH = 12;

/** Keep pulling sentences into the theme until it is at least this long. */
const MIN_THEME_LENGTH = 90;

/** Frontmatter `theme`, and the raw material for the summary. */
const MAX_THEME_LENGTH = 200;

/** Blog summaries feed meta descriptions, which Google shows to ~158 chars. */
const MAX_SUMMARY_LENGTH = 155;

/**
 * Words a title must not end on: each one promises a continuation, so a title
 * ending there reads as truncated even when it lands on a word boundary.
 */
const DANGLING_WORDS = new Set([
  'a', 'about', 'above', 'across', 'after', 'against', 'along', 'among', 'an', 'and', 'around',
  'as', 'at', 'back', 'be', 'because', 'been', 'before', 'behind', 'being', 'below', 'beneath',
  'beside', 'between', 'beyond', 'but', 'by', 'down', 'during', 'each', 'either', 'every', 'for',
  'from', 'had', 'has', 'have', 'her', 'his', 'how', 'if', 'in', 'inside', 'into', 'is', 'it',
  'its', 'more', 'most', 'much', 'near', 'neither', 'nor', 'not', 'of', 'off', 'on', 'onto', 'or',
  'our', 'out', 'outside', 'over', 'per', 'roughly', 'since', 'so', 'some', 'than', 'that', 'the',
  'their', 'then', 'there', 'these', 'they', 'this', 'those', 'through', 'to', 'toward', 'towards',
  'under', 'until', 'up', 'upon', 'via', 'was', 'were', 'what', 'when', 'where', 'which', 'while',
  'who', 'whose', 'why', 'with', 'within', 'without', 'would', 'your',
]);

/**
 * Trailing tokens whose period ends an abbreviation, not a sentence. Anything
 * matching a dotted initialism ("U.S", "N.O.A.A") is caught separately.
 */
const ABBREVIATIONS = new Set([
  'approx', 'ca', 'cf', 'dr', 'eg', 'est', 'etc', 'fig', 'ft', 'gen', 'ie', 'inc', 'jr', 'lat',
  'lon', 'lt', 'ltd', 'max', 'min', 'mr', 'mrs', 'ms', 'mt', 'no', 'prof', 'sgt', 'sr', 'st',
  'vs',
]);

/** Collapse whitespace runs and trim. */
function collapse(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/** True when the text ends on an abbreviation's period rather than a full stop. */
function endsWithAbbreviation(text: string): boolean {
  const token = (text.trim().split(/\s+/).pop() ?? '')
    .replace(/[)\]"'”’]+$/, '')
    .replace(/\.$/, '')
    .toLowerCase();
  if (!token) return false;
  if (ABBREVIATIONS.has(token.replace(/\./g, ''))) return true;
  // Single letters and dotted initialisms: "U", "U.S", "a.m", "N.O.A.A".
  return /^[a-z](\.[a-z])*$/.test(token);
}

/**
 * Sentences of a paragraph, treating abbreviation periods as part of the
 * sentence they sit in.
 */
export function splitSentences(paragraph: string): string[] {
  const text = collapse(paragraph);
  if (!text) return [];

  const sentences: string[] = [];
  let start = 0;
  const boundary = /[.!?]+["'”’)\]]*\s/g;
  let match: RegExpExecArray | null;

  while ((match = boundary.exec(text)) !== null) {
    const end = match.index + match[0].length;
    const candidate = text.slice(start, end);
    if (endsWithAbbreviation(candidate)) continue;
    sentences.push(candidate.trim());
    start = end;
  }

  const tail = text.slice(start).trim();
  if (tail) sentences.push(tail);
  return sentences;
}

/**
 * The opening of a paragraph: whole sentences up to `max` characters, taking
 * at least `min` where the paragraph allows it.
 */
export function leadSentences(paragraph: string, min: number, max: number): string {
  const sentences = splitSentences(paragraph);
  let lead = '';
  for (const sentence of sentences) {
    const next = lead ? `${lead} ${sentence}` : sentence;
    if (lead && next.length > max) break;
    lead = next;
    if (lead.length >= min) break;
  }
  return lead.length > max ? trimToWords(lead, max) : lead;
}

/** Cut to `max` characters on a word boundary, with no trailing function word. */
export function trimToWords(text: string, max: number): string {
  const clean = collapse(text);
  // Nothing was cut, so nothing dangles — a complete sentence keeps its period.
  if (clean.length <= max) return clean;

  const head = clean.slice(0, max + 1);
  const lastSpace = head.lastIndexOf(' ');
  let cut = lastSpace > 0 ? head.slice(0, lastSpace) : head.slice(0, max);

  // Strip edge punctuation, then any word that leaves the phrase hanging, then
  // the punctuation that word was attached to — repeatedly, since dropping
  // "of the" exposes another boundary.
  let previous = '';
  while (cut !== previous) {
    previous = cut;
    cut = cut.replace(/[\s,;:.!?/\-–—([{"'“‘]+$/, '');
    const words = cut.split(' ');
    const last = words[words.length - 1]?.toLowerCase().replace(/[^a-z']/g, '');
    if (words.length > 1 && last && DANGLING_WORDS.has(last)) {
      cut = words.slice(0, -1).join(' ');
    }
  }
  return cut;
}

/**
 * `<topic>: <opening phrase>`, at most `max` characters, cut on a word
 * boundary. Falls back to the topic title alone when there is no room for a
 * phrase worth reading.
 */
export function buildPostTitle(
  topicTitle: string,
  theme: string,
  max = MAX_TITLE_LENGTH,
): string {
  const topic = trimToWords(topicTitle, max);
  const room = max - topic.length - 2;
  if (room < MIN_TITLE_PHRASE_LENGTH) return topic;

  const phrase = trimToWords(theme, room);
  if (phrase.length < MIN_TITLE_PHRASE_LENGTH) return topic;
  return `${topic}: ${phrase}`;
}

/** Meta-description-shaped summary, falling back to the topic title. */
export function buildPostSummary(theme: string, topicTitle: string): string {
  const summary = clampDescription(theme, MAX_SUMMARY_LENGTH);
  return summary || collapse(topicTitle);
}

/**
 * The draft's opening, used for both the title suffix and the summary. Prefers
 * the first prose paragraph, then the news angle, then the topic title.
 */
export function deriveTheme(markdown: string, newsAngle: string, topicTitle: string): string {
  const firstParagraph = markdown
    .split(/\r?\n/)
    .map(line => line.trim())
    .find(line => line && !line.startsWith('#') && !line.startsWith('!'));

  if (firstParagraph) {
    const lead = leadSentences(firstParagraph, MIN_THEME_LENGTH, MAX_THEME_LENGTH);
    if (lead.length >= 20) return lead;
  }
  if (newsAngle) return trimToWords(newsAngle, MAX_THEME_LENGTH);
  return collapse(topicTitle);
}
