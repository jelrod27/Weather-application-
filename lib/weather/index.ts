/**
 * Weather API Module - Barrel Export
 *
 * Re-exports only what callers actually import through this path. Everything
 * else was re-exported here for "backward compatibility" that nothing used —
 * 28 dead symbols that knip 6.23 did not detect and 6.29 does. Import the
 * owning module directly (./weather-utils, ./weather-geocoding, …) rather than
 * widening this surface again.
 */

export { fetchWeatherData, fetchWeatherByLocation } from './weather-current';

export type { GeocodingResponse } from './weather-geocoding';
