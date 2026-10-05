import { fetchWithTimeout } from '@/lib/fetch-with-timeout';
import { parseGairmetJson } from '@/lib/aviation/turbulence';
import type { TurbulenceData } from '@/lib/aviation/turbulence';

export async function fetchTurbulenceAdvisories(): Promise<TurbulenceData> {
  const forecastHours = [0, 3, 6, 9, 12];
  const results = await Promise.allSettled(forecastHours.map(async (hour) => {
    const response = await fetchWithTimeout(`https://aviationweather.gov/api/data/gairmet?product=tango&format=json&fore=${hour}`, {
      timeoutMs: 8000, maxRetries: 0,
      // The API response is CDN-cached. Keep acquisition time truthful on refresh.
      cache: 'no-store',
      headers: { 'User-Agent': '16BitWeather/1.0 (https://www.16bitweather.co)' },
    });
    if (!response.ok) throw new Error(`G-AIRMET upstream status ${response.status}`);
    return parseGairmetJson(response.status === 204 ? [] : await response.json());
  }));
  const fulfilled = results.flatMap(result => result.status === 'fulfilled' ? [result.value] : []);
  if (!fulfilled.length) throw new Error('All G-AIRMET snapshots unavailable');
  const parsed = {
    polygons: fulfilled.flatMap(result => result.polygons),
    rejectedRecords: fulfilled.reduce((sum, result) => sum + result.rejectedRecords, 0),
  };
  const unavailableForecastHours = forecastHours.filter((_, index) => results[index].status === 'rejected');
  const now = Date.now();
  const polygons = parsed.polygons.filter(polygon => Date.parse(polygon.validTo) > now);
  return {
    polygons, fetchedAt: new Date(now).toISOString(), source: 'NOAA AWC G-AIRMET', coverage: 'CONUS',
    status: parsed.rejectedRecords > 0 || unavailableForecastHours.length > 0 ? 'partial' : parsed.polygons.length > 0 && !polygons.length ? 'stale'
      : polygons.length ? 'available' : 'empty',
    rejectedRecords: parsed.rejectedRecords,
    unavailableForecastHours,
  };
}
