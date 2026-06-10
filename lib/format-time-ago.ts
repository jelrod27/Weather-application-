/**
 * Shared relative "time ago" formatter
 *
 * Consolidates the near-identical formatTimeAgo helpers previously
 * duplicated across earth-sciences, aviation, and space-weather UI.
 */

export interface FormatTimeAgoOptions {
  /**
   * 'compact' (default) renders "5m ago" / "3h 24m ago" / "2d ago".
   * 'long' renders "5 mins ago" / "3 hours ago" / "2 days ago".
   */
  style?: 'long' | 'compact';
  /**
   * Reference timestamp in epoch milliseconds. Defaults to Date.now().
   * Pass a client-only clock value to avoid SSR hydration mismatches.
   */
  now?: number;
}

/**
 * Format the elapsed time since `input` as a human-readable string.
 * Returns 'unknown' for unparseable input and 'just now' for
 * timestamps under a minute old (or in the future).
 */
export function formatTimeAgo(
  input: string | number | Date,
  options: FormatTimeAgoOptions = {}
): string {
  const { style = 'compact', now = Date.now() } = options;

  const then = input instanceof Date ? input.getTime() : new Date(input).getTime();
  if (!Number.isFinite(then)) return 'unknown';

  const diffMs = now - then;
  if (diffMs < 0) return 'just now';

  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return 'just now';
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);

  if (style === 'long') {
    if (mins < 60) return `${mins} min${mins !== 1 ? 's' : ''} ago`;
    if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    return `${days} day${days !== 1 ? 's' : ''} ago`;
  }

  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ${mins % 60}m ago`;
  return `${days}d ago`;
}
