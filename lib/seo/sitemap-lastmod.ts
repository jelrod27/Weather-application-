/**
 * Honest sitemap lastmod buckets.
 *
 * Google ignores sitemaps that stamp every URL with `new Date()` on each
 * request. Bucket timestamps so live hubs change hourly, cities weekly, and
 * static education pages monthly.
 */

export function startOfUtcHour(now: Date = new Date()): Date {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours()),
  )
}

export function startOfUtcDay(now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
}

/** Monday 00:00 UTC of the current ISO-style week. */
export function startOfUtcWeek(now: Date = new Date()): Date {
  const daysFromMonday = (now.getUTCDay() + 6) % 7
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysFromMonday),
  )
}

export function startOfUtcMonth(now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
}
