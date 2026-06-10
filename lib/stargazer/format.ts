/**
 * Stargazer display-time formatters
 *
 * Shared 24-hour time and short date formatting previously duplicated
 * across the stargazer card components.
 */

/** Format a Date as a 24-hour "HH:MM" string; null renders as '--:--'. */
export function formatTime(date: Date | null): string {
  if (!date) return '--:--';
  return new Date(date).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/** Format a Date as a short "Mon D" string (e.g. "Jun 9"). */
export function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
  });
}
