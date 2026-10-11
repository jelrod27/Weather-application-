/** Seven UTC forecast days for named city points, not regional or synoptic analyses. */
import { DAY_MS } from '@/lib/newsletter/coverage';
import { collectSource, finiteNumber, objectRecord } from './source';
import type { ReportingWindow } from '@/lib/newsletter/coverage';
import type { Collected } from './source';
export interface RegionForecast {
  region: string;
  lat: number;
  lon: number;
  daily: Array<{
    date: string;
    tMaxF: number;
    tMinF: number;
    precipIn: number;
    precipProb: number;
    weatherCode: number;
  }>;
}

export interface ForecastOutlook {
  conusQuadrants: RegionForecast[];
  international: RegionForecast[];
  fetchedAt: string;
}

const CONUS_QUADRANTS: Array<Pick<RegionForecast, 'region' | 'lat' | 'lon'>> = [
  { region: 'Northeast (NYC area)', lat: 40.71, lon: -74.0 },
  { region: 'Southeast (Atlanta area)', lat: 33.75, lon: -84.39 },
  { region: 'Midwest (Chicago area)', lat: 41.88, lon: -87.63 },
  { region: 'Mountain West (Denver area)', lat: 39.74, lon: -104.99 },
  { region: 'Pacific (San Francisco area)', lat: 37.77, lon: -122.42 },
  { region: 'South Plains (Dallas area)', lat: 32.78, lon: -96.8 },
];

const INTERNATIONAL: Array<Pick<RegionForecast, 'region' | 'lat' | 'lon'>> = [
  { region: 'London', lat: 51.5, lon: -0.13 },
  { region: 'Tokyo', lat: 35.68, lon: 139.69 },
  { region: 'Sydney', lat: -33.87, lon: 151.21 },
];

export async function fetchForecastOutlook(now = new Date()): Promise<Collected<ForecastOutlook>> {
  const start = new Date(now);
  start.setUTCHours(0, 0, 0, 0);
  const window = { start: start.toISOString(), end: new Date(start.getTime() + 7 * DAY_MS).toISOString() };
  const results = await Promise.all([...CONUS_QUADRANTS, ...INTERNATIONAL].map(region => fetchRegion(region, window)));
  const data = results.flatMap(result => result.data ? [result.data] : []);
  return {
    data: data.length ? {
      conusQuadrants: data.filter(region => CONUS_QUADRANTS.some(r => r.region === region.region)),
      international: data.filter(region => INTERNATIONAL.some(r => r.region === region.region)),
      fetchedAt: new Date().toISOString(),
    } : null,
    sources: results.map(result => result.audit),
  };
}

async function fetchRegion(region: Pick<RegionForecast, 'region' | 'lat' | 'lon'>, window: ReportingWindow) {
  const fields = ['temperature_2m_max', 'temperature_2m_min', 'precipitation_sum', 'precipitation_probability_max', 'weather_code'];
  const params = new URLSearchParams({
    latitude: String(region.lat), longitude: String(region.lon), daily: fields.join(','),
    temperature_unit: 'fahrenheit', precipitation_unit: 'inch', timezone: 'UTC',
    start_date: window.start.slice(0, 10), end_date: new Date(Date.parse(window.end) - DAY_MS).toISOString().slice(0, 10),
  });
  return collectSource({
    id: `forecast-${region.lat}-${region.lon}`, label: `Open-Meteo point forecast: ${region.region}`,
    url: `https://api.open-meteo.com/v1/forecast?${params}`, requested: window, unit: 'UTC forecast days',
  }, raw => {
    const payload = objectRecord(raw);
    const d = objectRecord(payload.daily);
    const units = objectRecord(payload.daily_units);
    if (units.temperature_2m_max !== '°F' || units.temperature_2m_min !== '°F' ||
        units.precipitation_sum !== 'inch' || units.precipitation_probability_max !== '%' ||
        payload.utc_offset_seconds !== 0 || !Array.isArray(d.time) ||
        !fields.every(field => Array.isArray(d[field]))) throw new SyntaxError('Invalid daily schema or units');
    const daily: RegionForecast['daily'] = [];
    const covered: ReportingWindow[] = [];
    for (let offset = 0; offset < 7; offset++) {
      const time = Date.parse(window.start) + offset * DAY_MS;
      const date = new Date(time).toISOString().slice(0, 10);
      const index = d.time.indexOf(date);
      if (index < 0 || d.time.lastIndexOf(date) !== index) continue;
      const values = fields.map(field => finiteNumber((d[field] as unknown[])[index]));
      if (values.some(v => v === null)) continue;
      const [tMaxF, tMinF, precipIn, precipProb, weatherCode] = values as number[];
      if (tMaxF < tMinF || tMinF < -150 || tMaxF > 160 || precipIn < 0 || precipProb < 0 || precipProb > 100 ||
          ![0,1,2,3,45,48,51,53,55,56,57,61,63,65,66,67,71,73,75,77,80,81,82,85,86,95,96,99].includes(weatherCode)) continue;
      daily.push({ date, tMaxF, tMinF, precipIn, precipProb, weatherCode });
      covered.push({ start: new Date(time).toISOString(), end: new Date(time + DAY_MS).toISOString() });
    }
    return {
      data: daily.length ? { ...region, daily } : null, records: daily.length,
      times: daily.map(day => `${day.date}T00:00:00.000Z`), covered,
      expectedUnits: 7, observedUnits: daily.length,
      status: daily.length === 7 ? 'complete' : daily.length ? 'partial' : 'malformed',
      reasons: daily.length < 7 ? [`${7 - daily.length} forecast days missing or invalid; only supplied dates support an outlook`] : [],
    };
  });
}
