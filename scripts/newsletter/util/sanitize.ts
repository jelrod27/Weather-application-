/**
 * Strip user-content control characters and markdown fences from any external
 * string before it gets interpolated into an LLM prompt. Originally lived in
 * scripts/newsletter/news.ts to handle Reddit/RSS headlines; factored here in
 * the Phase 4 cleanup so other prompt-input sites (notably NWS warning
 * fields in scripts/newsletter/sunday.ts) can apply the same defense.
 *
 * Defends against:
 *   - Triple-backtick markdown fences corrupting downstream JSON-fence parsers
 *   - Control characters (newlines, NULs) that can break model output structure
 *   - Excessive whitespace runs that waste tokens
 *   - Oversized strings that inflate prompt cost
 */

// Built from a string so the source file isn't littered with raw control bytes.
const CONTROL_CHARS = new RegExp('[\\u0000-\\u001F\\u007F]', 'g');

export function sanitizeForPrompt(input: string | undefined | null, maxLength = 300): string {
  if (!input) return '';
  return input
    .replace(/```/g, "'''") // collapse triple backticks so JSON fences cannot break
    .replace(/`/g, "'") // single backticks -> straight quote
    .replace(CONTROL_CHARS, ' ') // strip control characters (NULs, newlines, etc.)
    .replace(/\s+/g, ' ') // collapse whitespace runs (incl. newlines)
    .trim()
    .slice(0, maxLength);
}
