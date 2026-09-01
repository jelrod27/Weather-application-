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
 * Opus 5 thinks before it writes, so a call runs longer than the wrapper's
 * two-minute default and `max_tokens` has to cover the thinking as well as the
 * prose. Both are set here rather than at each call site, and `temperature` is
 * left to the wrapper, which withholds it from models that reject it.
 */

import { callAnthropic, type CallAnthropicOptions } from '../newsletter/repetition';

export const EDUCATION_MODEL = process.env.EDUCATION_MODEL || 'claude-opus-5';

/** Long enough for a thinking model to draft ~1,000 words with twelve sources in context. */
const EDUCATION_TIMEOUT_MS = 10 * 60_000;

/** Output ceiling for drafting and judging; a thinking model's reasoning counts against it. */
const EDUCATION_MAX_TOKENS = 16_000;

export function callEducationModel(opts: CallAnthropicOptions): Promise<string> {
  return callAnthropic({
    ...opts,
    model: opts.model ?? EDUCATION_MODEL,
    maxTokens: opts.maxTokens ?? EDUCATION_MAX_TOKENS,
    timeoutMs: opts.timeoutMs ?? EDUCATION_TIMEOUT_MS,
  });
}
