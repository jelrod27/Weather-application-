/**
 * Parsing JSON out of a model response, in one place.
 *
 * Three call sites used to carry their own fence-stripper with three different
 * levels of robustness — only one tolerated prose before the JSON — so the same
 * model output parsed fine at one call site and silently returned nothing at
 * another. Every caller now crosses this seam and gets the same tolerance.
 */

/**
 * Strips a ```json fence, or — when the model prefixes the JSON with prose —
 * returns the largest brace-or-bracket block it can find.
 */
export function stripFence(raw: string): string {
  const trimmed = raw.trim();
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  if (fenceMatch) return fenceMatch[1].trim();

  const objStart = trimmed.indexOf('{');
  const arrStart = trimmed.indexOf('[');
  let start = -1;
  if (objStart !== -1 && (arrStart === -1 || objStart < arrStart)) start = objStart;
  else if (arrStart !== -1) start = arrStart;

  if (start !== -1) {
    const close = start === objStart ? trimmed.lastIndexOf('}') : trimmed.lastIndexOf(']');
    if (close > start) return trimmed.slice(start, close + 1);
  }
  return trimmed;
}

/** Parses a model response as JSON, returning null when it is unusable. */
export function parseModelJson(raw: string): unknown {
  try {
    return JSON.parse(stripFence(raw));
  } catch {
    return null;
  }
}

/** Parses a model response expected to be a JSON array of strings. */
export function parseModelJsonArray(raw: string): string[] {
  const parsed = parseModelJson(raw);
  if (!Array.isArray(parsed)) return [];
  return parsed
    .filter((entry): entry is string => typeof entry === 'string')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

/** Parses a model response expected to be a JSON object. */
export function parseModelJsonObject(raw: string): Record<string, unknown> {
  const parsed = parseModelJson(raw);
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    return parsed as Record<string, unknown>;
  }
  return {};
}
