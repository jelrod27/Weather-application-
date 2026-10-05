// Investigation harness, not an accuracy test: NWS is independent guidance,
// not an observation of weather that has not happened yet.
// Capture: node planning/research/issue-656/compare-forecasts.mjs capture <file.json> [model ...]
// Replay:  node planning/research/issue-656/compare-forecasts.mjs replay <file.json>
import { readFile, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const [mode, file, ...models] = process.argv.slice(2);
assert(['capture', 'replay'].includes(mode) && file, 'Expected capture|replay <file.json> [models]');
const point = { latitude: 37.6624, longitude: -121.8747 };
const targetDates = ['2026-10-09', '2026-10-10'];

async function request(url) {
  const response = await fetch(url, {
    headers: { 'User-Agent': '16bitweather-issue-656 (https://www.16bitweather.co)' },
    signal: AbortSignal.timeout(30000),
  });
  assert(response.ok, `${response.status} ${url}`);
  const body = await response.json();
  // Save only public diagnostic headers, never cookies or credentials.
  const headers = Object.fromEntries(['date', 'age', 'last-modified', 'x-vercel-cache', 'cache-control']
    .map(key => [key, response.headers.get(key)]));
  return { url: String(url), retrievedAt: new Date().toISOString(), headers, body };
}

function forecastUrl(model, overrides = {}) {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.search = new URLSearchParams({
    ...point, daily: 'temperature_2m_max,temperature_2m_min', hourly: 'temperature_2m',
    temperature_unit: 'fahrenheit', timezone: 'America/Los_Angeles', forecast_days: '7',
    ...(model ? { models: model } : {}), ...overrides,
  }).toString();
  return url;
}

function compactOpenMeteo(result) {
  const { latitude, longitude, elevation, timezone, utc_offset_seconds,
    daily_units, daily, hourly_units, hourly } = result.body;
  return { ...result, body: { latitude, longitude, elevation, timezone, utc_offset_seconds,
    daily_units, daily, hourly_units: { temperature_2m: hourly_units?.temperature_2m },
    hourly: { time: hourly?.time, temperature_2m: hourly?.temperature_2m } } };
}

let snapshot;
if (mode === 'capture') {
  snapshot = { point, targetDates, sources: {} };
  const sources = snapshot.sources;
  const appUrl = 'https://www.16bitweather.co/api/open-meteo/forecast?lat=37.6624&lon=-121.8747&days=7&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch';
  sources.app = compactOpenMeteo(await request(appUrl));
  sources.app_celsius = compactOpenMeteo(await request(appUrl.replace('temperature_unit=fahrenheit', 'temperature_unit=celsius')));
  sources.best_match = compactOpenMeteo(await request(forecastUrl()));
  sources.celsius = compactOpenMeteo(await request(forecastUrl(undefined, { temperature_unit: 'celsius' })));
  sources.no_downscaling = compactOpenMeteo(await request(forecastUrl(undefined, { elevation: 'nan' })));
  sources.nws_point = await request(`https://api.weather.gov/points/${point.latitude},${point.longitude}`);
  sources.nws = await request(sources.nws_point.body.properties.forecast);
  for (const model of models) sources[model] = compactOpenMeteo(await request(forecastUrl(model)));
  await writeFile(file, `${JSON.stringify(snapshot, null, 2)}\n`);
} else {
  snapshot = JSON.parse(await readFile(file, 'utf8'));
}

const { sources } = snapshot;
assert.equal(sources.app.body.timezone, 'America/Los_Angeles');
assert.equal(sources.app.body.daily_units.temperature_2m_max, '°F');
assert.equal(sources.celsius.body.daily_units.temperature_2m_max, '°C');
assert.deepEqual(sources.app.body.daily.time, sources.best_match.body.daily.time);
assert.deepEqual(sources.app.body.daily.temperature_2m_max, sources.best_match.body.daily.temperature_2m_max);
assert.deepEqual(sources.app.body.daily.temperature_2m_min, sources.best_match.body.daily.temperature_2m_min);
if (sources.app_celsius) {
  assert.equal(sources.app_celsius.body.daily_units.temperature_2m_max, '°C');
  assert.deepEqual(sources.app_celsius.body.daily.time, sources.celsius.body.daily.time);
  assert.deepEqual(sources.app_celsius.body.daily.temperature_2m_max, sources.celsius.body.daily.temperature_2m_max);
  assert.deepEqual(sources.app_celsius.body.daily.temperature_2m_min, sources.celsius.body.daily.temperature_2m_min);
}
const dailyValue = (source, date) => {
  const daily = source.body.daily;
  const index = daily.time.indexOf(date);
  assert(index >= 0, `Missing ${date} in ${source.url}`);
  const value = daily.temperature_2m_max[index];
  assert(Number.isFinite(value), `Missing temperature on ${date} in ${source.url}`);
  return value;
};
const rows = snapshot.targetDates.map(date => {
  const period = sources.nws.body.properties.periods.find(p => p.isDaytime && p.startTime.startsWith(date));
  assert(period && period.temperatureUnit === 'F', `Missing NWS Fahrenheit daytime period for ${date}`);
  const row = { date, nws: period.temperature };
  for (const [name, source] of Object.entries(sources)) {
    if (source.body.daily) row[name] = dailyValue(source, date);
  }
  row.appMinusNwsF = +(row.app - row.nws).toFixed(1);
  return row;
});
console.table(rows);
for (const row of rows) {
  assert.equal(row.app, row.best_match, `App/provider mismatch on ${row.date}`);
  assert(Math.abs(row.best_match - (row.celsius * 9 / 5 + 32)) < 0.2, `Unit mismatch on ${row.date}`);
}
console.log('PASS: app preserves provider daily highs; Celsius/Fahrenheit conversion agrees within rounding.');
console.log(rows.some(row => Math.abs(row.appMinusNwsF) >= 10)
  ? 'DISCREPANCY REPRODUCED: app differs from independent NWS guidance by at least 10°F.'
  : 'No >=10°F app/NWS discrepancy in this snapshot.');
console.log('This flags forecast disagreement, not verified forecast error.');
console.log(`NWS updateTime: ${sources.nws.body.properties.updateTime}`);
console.log(`Snapshot: ${file}; app retrieved: ${sources.app.retrievedAt}`);
