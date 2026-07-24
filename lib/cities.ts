/**
 * City catalog entrypoints.
 *
 * Ownership (do not re-triplicate):
 * - `city-metadata` — SEO page content / enrichments / neighbors (large)
 * - `city-database` — autocomplete / search index
 * - `city-data` — random-link catalog with lat/lon for ~100 US cities
 * - `us-states` — state code/name authority for geocoding + slugs
 */

export {
  cityData,
  cityEnrichments,
  cityNeighbors,
  getCityEnrichment,
  getNearbyCities,
  type CitySeoEnrichment,
} from '@/lib/city-metadata'

export {
  CITY_DATABASE,
  searchCities,
  getCityDisplayName,
  getCityPageSlug,
  type CityData,
} from '@/lib/city-database'

export { CITY_DATA } from '@/lib/city-data'

export {
  US_STATE_CODES,
  US_STATE_ABBREVIATIONS,
  US_STATE_NAMES,
  toStateAbbr,
  isUsState,
} from '@/lib/us-states'
