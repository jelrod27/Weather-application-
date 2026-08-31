/**
 * Does the prose say only what the sources say?
 *
 * Every other gate in this pipeline checks form — length, structure, register,
 * no links, citations drawn from the catalog. None of them checks truth. A
 * confident wrong number passes all of them cleanly, and it does so on a page
 * that lists NWS and NOAA underneath it, which turns a mistake into a
 * misattribution.
 *
 * The judge is not trusted. Asking a model "is this supported?" and believing
 * the yes is a rubber stamp, so the contract here is that a claim counts as
 * supported only when the judge produces a **verbatim span from the fetched
 * source** and that span is then found in the source text by `String.includes`.
 * A fabricated justification fails mechanically rather than persuasively. That
 * is the same move the diagram registry and the source catalog make: the model
 * names something, and code resolves it.
 *
 * Risk is graded in code, not by the judge. An unsupported sentence about how
 * storms need moisture is a wording problem; an unsupported "58 mph" or "the
 * National Weather Service defines" is the thing that must never ship
 * unreviewed.
 */

import { parseModelJsonObject } from '../newsletter/model-json';
import { callAnthropic, DEFAULT_MODEL, type AnthropicCacheBlock } from '../newsletter/repetition';
import type { GroundedSource } from './grounding';

/** Shorter spans match by coincidence; this is long enough to mean something. */
const MIN_QUOTE_CHARS = 24;

/** Agencies whose name in a sentence turns an error into a misattribution. */
const ATTRIBUTION = /\b(NWS|NOAA|SPC|NHC|NSSL|National Weather Service|Storm Prediction Center|National Hurricane Center)\b/i;

export type ClaimVerdict = 'supported' | 'unsupported';

export interface FactCheckClaim {
  /** The assertion, as the judge restated it. */
  text: string;
  verdict: ClaimVerdict;
  /** Catalog id the judge says supports it. */
  sourceId?: string;
  /** Span the judge says appears in that source. */
  quote?: string;
  /** Set when the quote could not be found in any fetched source. */
  quoteNotFound?: boolean;
  /** Set when the quote was found, but in a different source than claimed. */
  misattributed?: string;
  /** Carries a number — the class of error most worth catching. */
  hasNumber: boolean;
  /** Names an agency — an unsupported one is a misattribution. */
  hasAttribution: boolean;
}

export interface FactCheckResult {
  claims: FactCheckClaim[];
  /** Claims with no usable support, after quote verification. */
  unsupported: FactCheckClaim[];
  /** Unsupported claims carrying a number or an agency name. */
  highRisk: FactCheckClaim[];
  /** Claims where the judge's quote was not in the source it named. */
  quoteFailures: FactCheckClaim[];
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/[\s ]+/g, ' ').replace(/[“”]/g, '"').replace(/[‘’]/g, "'").trim();
}

/**
 * Resolves the judge's evidence against the text actually fetched.
 *
 * A claim is downgraded to unsupported when its quote appears nowhere. When the
 * quote exists but in a different source than the judge named, the claim stands
 * — the prose is grounded — but the misattribution is recorded, because a judge
 * that assigns evidence to the wrong page is a judge to watch.
 */
export function verifyAgainstSources(
  claims: FactCheckClaim[],
  sources: GroundedSource[],
): FactCheckClaim[] {
  const byId = new Map(sources.map((source) => [source.entry.id, normalize(source.text)]));

  return claims.map((claim) => {
    if (claim.verdict !== 'supported') return claim;

    const quote = normalize(claim.quote ?? '');
    if (quote.length < MIN_QUOTE_CHARS) {
      return { ...claim, verdict: 'unsupported' as const, quoteNotFound: true };
    }

    const claimed = claim.sourceId ? byId.get(claim.sourceId) : undefined;
    if (claimed?.includes(quote)) return claim;

    const elsewhere = [...byId.entries()].find(([, text]) => text.includes(quote));
    if (elsewhere) return { ...claim, misattributed: elsewhere[0] };

    return { ...claim, verdict: 'unsupported' as const, quoteNotFound: true };
  });
}

function classify(text: string): { hasNumber: boolean; hasAttribution: boolean } {
  return { hasNumber: /\d/.test(text), hasAttribution: ATTRIBUTION.test(text) };
}

function summarize(claims: FactCheckClaim[]): FactCheckResult {
  const unsupported = claims.filter((claim) => claim.verdict === 'unsupported');
  return {
    claims,
    unsupported,
    highRisk: unsupported.filter((claim) => claim.hasNumber || claim.hasAttribution),
    quoteFailures: claims.filter((claim) => claim.quoteNotFound),
  };
}

export interface FactCheckOptions {
  body: string;
  sources: GroundedSource[];
  model?: string;
}

/**
 * System blocks repeat the source text so the judge reads the same material the
 * draft was written from. Cached, so this costs little on top of drafting.
 */
function systemBlocks(sources: GroundedSource[]): AnthropicCacheBlock[] {
  return [
    {
      type: 'text',
      text:
        'You are a fact-checker for a weather reference publication. You are given source material and a draft written from it. You do not rewrite, improve or defend the draft. You judge only whether the source material states what the draft states.',
      cache_control: { type: 'ephemeral' },
    },
    {
      type: 'text',
      text: `SOURCE MATERIAL\n\n${sources
        .map((source) => `### ${source.entry.id} — ${source.entry.label}\n${source.text}`)
        .join('\n\n')}`,
      cache_control: { type: 'ephemeral' },
    },
  ];
}

export async function factCheck(options: FactCheckOptions): Promise<FactCheckResult> {
  const { body, sources } = options;

  const prompt = `List every checkable factual assertion in the draft below. A checkable assertion is a statement about the world that could be right or wrong: a number, a threshold, a measurement, a mechanism, a definition, or anything attributed to an agency. Skip pure prose transitions and anything that is only a description of how something looks in ordinary language.

For each assertion, decide whether the SOURCE MATERIAL states it.

Return JSON only, with this exact shape:
{
  "claims": [
    {
      "text": "the assertion, in your own words, one sentence",
      "verdict": "supported" | "unsupported",
      "sourceId": "the id of the source that states it, when supported",
      "quote": "an exact span copied character for character from that source, at least ${MIN_QUOTE_CHARS} characters, that states it"
    }
  ]
}

Rules that matter:
- "quote" must be copied verbatim from the source material above. Do not paraphrase it, do not tidy it, do not join two separate passages. It is checked against the source by exact match, and an invented quote marks the claim unsupported.
- If the source material does not state the assertion, return "unsupported" and omit sourceId and quote. That is a useful answer, not a failure. Do not stretch a nearby passage to cover it.
- Judge the assertion, not the wording. A draft saying 58 mph is supported by a source saying 58 mph, whatever the sentence around it looks like.
- Widely known background that no source states is still "unsupported". Report it honestly; the pipeline decides what matters.

DRAFT:
${body}`;

  const raw = await callAnthropic({
    model: options.model ?? DEFAULT_MODEL,
    systemBlocks: systemBlocks(sources),
    messages: [{ role: 'user', content: prompt }],
    maxTokens: 8000,
    temperature: 0,
  });

  const parsed = parseModelJsonObject(raw);
  const rawClaims = Array.isArray(parsed.claims) ? parsed.claims : [];

  const claims: FactCheckClaim[] = rawClaims.flatMap((item): FactCheckClaim[] => {
    if (!item || typeof item !== 'object') return [];
    const { text, verdict, sourceId, quote } = item as Record<string, unknown>;
    if (typeof text !== 'string' || !text.trim()) return [];
    return [
      {
        text: text.trim(),
        verdict: verdict === 'supported' ? 'supported' : 'unsupported',
        sourceId: typeof sourceId === 'string' ? sourceId : undefined,
        quote: typeof quote === 'string' ? quote : undefined,
        ...classify(text),
      },
    ];
  });

  return summarize(verifyAgainstSources(claims, sources));
}

/** The correction fed back to the writer when high-risk claims are unsupported. */
export function buildFactCorrection(highRisk: FactCheckClaim[]): string {
  return [
    'A fact-check found statements the source material does not support. Every number and every claim attributed to an agency must come from the sources you were given.',
    'For each one below, either restate it so the sources do support it, or remove it. Do not replace a number with a different invented number.',
    ...highRisk.map((claim) => `- ${claim.text}`),
  ].join('\n');
}

/** Markdown for the PR body, so a reviewer reads flagged lines instead of 900 words. */
export function formatFactCheck(result: FactCheckResult): string {
  const supported = result.claims.length - result.unsupported.length;
  const lines = [
    '## Fact check',
    '',
    `${supported} of ${result.claims.length} checkable claims are backed by a verbatim quote from the cited source.`,
  ];

  if (result.quoteFailures.length > 0) {
    lines.push(
      '',
      `${result.quoteFailures.length} claim(s) came back with a quote that is not in the source. Those are counted as unsupported.`,
    );
  }

  const misattributed = result.claims.filter((claim) => claim.misattributed);
  if (misattributed.length > 0) {
    lines.push('', '### Grounded, but cited to the wrong source', '');
    for (const claim of misattributed) {
      lines.push(`- ${claim.text} — quote found in \`${claim.misattributed}\`, not \`${claim.sourceId}\``);
    }
  }

  if (result.unsupported.length === 0) {
    lines.push('', 'Nothing unsupported. No lines need checking by hand.');
    return lines.join('\n');
  }

  lines.push('', '### Not found in the sources — check these by hand', '');
  for (const claim of result.unsupported) {
    const tags = [claim.hasNumber ? 'number' : null, claim.hasAttribution ? 'attribution' : null]
      .filter(Boolean)
      .join(', ');
    lines.push(`- [ ] ${claim.text}${tags ? ` _(${tags})_` : ''}`);
  }
  return lines.join('\n');
}
