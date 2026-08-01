/**
 * City catalog entrypoints.
 *
 * Ownership (do not re-triplicate):
 * - `city-metadata` — SEO page content / enrichments / neighbors (large)
 * - `city-database` — autocomplete / search index
 * - `city-data` — random-link catalog with lat/lon for ~100 US cities
 * - `us-states` — state code/name authority for geocoding + slugs
 *
 * Re-exports only what is imported through this path. Callers of the other
 * symbols import their owning module directly, so re-exporting them here was
 * dead surface.
 */

export { searchCities, type CityData } from '@/lib/city-database'

export { CITY_DATA } from '@/lib/city-data'
