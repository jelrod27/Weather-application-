/**
 * How long client-side weather state stays usable.
 *
 * These durations were three separate literals in three files, all written by
 * one function (`persistAfterFetch`) on every successful fetch. Two of them
 * matched at 10 minutes only by coincidence — nothing tied them together, so
 * changing one silently desynchronized the layers.
 */

/** Cached weather for a location, and the last-displayed weather. */
export const WEATHER_CACHE_TTL_MS = 10 * 60 * 1000;

/** Search-keyed results. Deliberately shorter than the location cache. */
export const WEATHER_SEARCH_CACHE_TTL_MS = 5 * 60 * 1000;

/** Resolved locations change far more slowly than conditions. */
export const LOCATION_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
