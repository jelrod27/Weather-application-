/**
 * City catalog entrypoints.
 *
 * The three source modules stay as internals of this facade:
 * - `city-metadata` — SEO page content / enrichments / neighbors
 * - `city-database` — autocomplete / search index
 * - `city-data` — random-link catalog with lat/lon
 *
 * App, component, and test code import this file only. Do not shard
 * city-metadata while the other two catalogs still exist.
 */

export { searchCities, type CityData } from '@/lib/city-database'

export { CITY_DATA } from '@/lib/city-data'

export {
  cityData,
  getCityEnrichment,
  getNearbyCities,
  type CitySeoEnrichment,
} from '@/lib/city-metadata'
