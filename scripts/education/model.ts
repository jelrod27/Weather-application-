/**
 * The Guide pipeline's model, and the one place it is chosen.
 *
 * Separate from the newsletter's `NEWSLETTER_MODEL` on purpose. The two
 * pipelines share `callAnthropic`, but a Guide is evergreen and indexed, and
 * every number in it is checked by a judge that has to find a verbatim span in
 * some 30,000 characters of source text. That job repays a stronger model; a
 * dated post does not, and one variable governing both would move the
 * newsletter's cost every time the Guides needed a better judge.
 *
 * Opus 5 thinks before it writes, and how much is the cost that matters here.
 * Left at its default effort, the first dry run spent four minutes and the
 * whole 16,000-token ceiling thinking about a 900-word draft and never reached
 * the prose. Medium effort is the default for every call in this pipeline —
 * the writing is grounded in supplied text, not derived — with a ceiling that
 * leaves room above it. Both are overridable from the environment so a run can
 * be tuned without a code change, and `temperature` is left to the wrapper,
 * which withholds it from models that reject it.
 */

import { callAnthropic, type CallAnthropicOptions } from '../newsletter/repetition';

export const EDUCATION_MODEL = process.env.EDUCATION_MODEL || 'claude-opus-5';

const EFFORT_LEVELS = ['low', 'medium', 'high', 'xhigh', 'max'] as const;
type Effort = (typeof EFFORT_LEVELS)[number];

function isEffort(value: string | undefined): value is Effort {
  return (EFFORT_LEVELS as readonly string[]).includes(value ?? '');
}

/**
 * Sonnet 4.6 accepts low/medium/high/max, not xhigh. Sending xhigh is a 400
 * from Anthropic rather than a quieter fallback, so refuse it here.
 */
const SONNET_46 = /claude-sonnet-4-6/;

export function assertEffortForModel(model: string, effort: Effort): void {
  if (effort === 'xhigh' && SONNET_46.test(model)) {
    throw new Error(
      `effort "xhigh" is not supported by ${model}; use low, medium, high, or max.`,
    );
  }
}

/** Reasoning depth for every Guide call. `EDUCATION_EFFORT` overrides; anything else is refused. */
export const EDUCATION_EFFORT: Effort = (() => {
  const requested = process.env.EDUCATION_EFFORT;
  if (requested === undefined || requested === '') return 'medium';
  if (isEffort(requested)) return requested;
  throw new Error(`EDUCATION_EFFORT must be one of ${EFFORT_LEVELS.join(', ')}, got "${requested}"`);
})();

/** Long enough for a thinking model to draft ~1,000 words with twelve sources in context. */
const EDUCATION_TIMEOUT_MS = 10 * 60_000;

/**
 * Output ceiling for drafting and judging; a thinking model's reasoning counts
 * against it. Twice what medium effort should need, so a long think fails the
 * call loudly rather than quietly truncating the prose.
 */
const EDUCATION_MAX_TOKENS = 32_000;

export function callEducationModel(opts: CallAnthropicOptions): Promise<string> {
  const model = opts.model ?? EDUCATION_MODEL;
  const effort = opts.effort ?? EDUCATION_EFFORT;
  assertEffortForModel(model, effort);
  return callAnthropic({
    ...opts,
    model,
    maxTokens: opts.maxTokens ?? EDUCATION_MAX_TOKENS,
    timeoutMs: opts.timeoutMs ?? EDUCATION_TIMEOUT_MS,
    effort,
  });
}
