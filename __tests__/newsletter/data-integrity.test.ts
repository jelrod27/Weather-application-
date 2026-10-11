/** @jest-environment node */
import fs from 'node:fs';
import path from 'node:path';
import { coverageOutcome, reportingWindow, DAY_MS } from '@/lib/newsletter/coverage';
import { parsePlanetaryKpIndex, parsePlanetaryKpSeries } from '@/lib/services/swpc-kp';
import { fetchSpaceWeatherSummary } from '../../scripts/newsletter/data/space-weather';
import { fetchPastWeekReports } from '../../scripts/newsletter/data/spc-reports';
import { fetchPastWeekWarnings } from '../../scripts/newsletter/data/mesonet';
import { fetchPastWeekQuakes } from '../../scripts/newsletter/data/earthquakes';
import { fetchForecastOutlook } from '../../scripts/newsletter/data/forecast';
import { collectSundayEvidence, formatSundayEvidence } from '../../scripts/newsletter/data/sunday-evidence';
import { runSunday } from '../../scripts/newsletter/sunday';
import { callAnthropic } from '../../scripts/newsletter/repetition';

jest.mock('../../scripts/newsletter/repetition', () => ({
  ...jest.requireActual('../../scripts/newsletter/repetition'), callAnthropic: jest.fn(),
}));

const NOW = new Date('2026-10-11T12:05:00Z');
const WINDOW = reportingWindow(NOW);
const START = Date.parse(WINDOW.start);
const FIXTURES = path.join(process.cwd(), '__tests__/fixtures/newsletter');
const HEADERS = 'Time,F_Scale,Location,County,State,Lat,Lon,Comments\nTime,Speed,Location,County,State,Lat,Lon,Comments\nTime,Size,Location,County,State,Lat,Lon,Comments';
const kpRows = Array.from({ length: 56 }, (_, i) => ({
  time_tag: new Date(START + i * 3 * 3_600_000).toISOString(), Kp: i === 2 ? 8 : 0,
}));

function json(data: unknown): Response { return new Response(JSON.stringify(data), { status: 200 }); }
let fetchMock: jest.SpiedFunction<typeof fetch>;
beforeEach(() => { fetchMock = jest.spyOn(globalThis, 'fetch'); });
afterEach(() => { jest.restoreAllMocks(); });

describe('recorded provider fixtures (see provenance.json for retrievals and excerpt limits)', () => {
  const fixture = (name: string): unknown => JSON.parse(fs.readFileSync(path.join(FIXTURES, name), 'utf8'));

  it('recovers the recorded NOAA weekly peak of Kp 7 and discloses excerpted X-ray coverage', async () => {
    fetchMock.mockImplementation(async input => json(fixture(String(input).includes('k-index') ? 'noaa-kp.json' : 'noaa-xray-excerpt.json')));
    const result = await fetchSpaceWeatherSummary(WINDOW);
    expect(result.data?.peakKpObserved).toBe(7);
    expect(result.sources[0]).toMatchObject({ status: 'complete', records: 56 });
    expect(result.sources[1].status).toBe('partial');
  });

  it('reads the actual IEM polygon schema and excludes products outside the five labeled warning types', async () => {
    fetchMock.mockImplementation(async () => json(fixture('iem-warnings-excerpt.json')));
    const result = await fetchPastWeekWarnings(7, NOW);
    expect(result.data?.totalWarnings).toBeGreaterThan(0);
    expect(result.data?.byType).not.toHaveProperty('FA.Y');
    expect(result.sources[0].status).toBe('complete');
  });

  it('reads all 35 preliminary SPC reports from the recorded October 8 report day', async () => {
    fetchMock.mockImplementation(async () => new Response(fs.readFileSync(path.join(FIXTURES, 'spc-reports.csv'), 'utf8')));
    const result = await fetchPastWeekReports(1, new Date('2026-10-09T12:05:00Z'));
    expect(result.data).toMatchObject({ total: 35, daysCovered: 1 });
  });

  it('reads the six recorded USGS significant events within the requested interval', async () => {
    fetchMock.mockImplementation(async input => json(String(input).includes('minsig') ? fixture('usgs-significant.json') : { type: 'FeatureCollection', features: [] }));
    const result = await fetchPastWeekQuakes(WINDOW);
    expect(result.data?.significantCount).toBe(6);
    expect(result.sources[0].status).toBe('complete');
  });

  it('reads the recorded seven-day city forecast with its real units and alignment', async () => {
    fetchMock.mockImplementation(async input => String(input).includes('latitude=40.71') ? json(fixture('open-meteo-nyc.json')) : new Response('', { status: 503 }));
    const result = await fetchForecastOutlook(NOW);
    expect(result.data?.conusQuadrants[0].daily).toHaveLength(7);
    expect(result.sources[0].status).toBe('complete');
    expect(result.sources.slice(1).every(source => !source.usable)).toBe(true);
  });
});

describe('full NOAA series and observation windows', () => {
  it('uses completed noon-to-noon UTC reporting days, including before-noon runs', () => {
    expect(WINDOW).toEqual({ start: '2026-10-04T12:00:00.000Z', end: '2026-10-11T12:00:00.000Z' });
    expect(reportingWindow(new Date('2026-10-11T11:59:59Z')).end).toBe('2026-10-10T12:00:00.000Z');
  });

  it('keeps all 56 modern object samples while the app still displays the latest eight', () => {
    const series = parsePlanetaryKpSeries([...kpRows].reverse());
    expect(series.samples).toHaveLength(56);
    expect(Math.max(...series.samples.map(s => s.kp))).toBe(8);
    expect(parsePlanetaryKpIndex(kpRows).recent).toHaveLength(8);
    expect(parsePlanetaryKpIndex(kpRows).current?.kp).toBe(0);
  });

  it.each(['Kp', 'kp', 'kp_index'])('supports the %s object key and valid numeric zero', key => {
    expect(parsePlanetaryKpSeries([{ time_tag: WINDOW.start, [key]: '0' }]).samples[0].kp).toBe(0);
  });

  it('accepts legacy header arrays and headerless arrays without dropping a real first sample', () => {
    const rows = [[WINDOW.start, '0'], [kpRows[1].time_tag, '3.33']];
    expect(parsePlanetaryKpSeries([['time_tag', 'Kp'], ...rows]).samples).toHaveLength(2);
    expect(parsePlanetaryKpSeries(rows).samples[0].kp).toBe(0);
  });

  it('rejects malformed numbers and timestamps without turning them into zero', () => {
    const raw = ['', null, true, Infinity, NaN, '9junk', -1, 10].map(Kp => ({ time_tag: WINDOW.start, Kp }));
    raw.push({ time_tag: 'not-a-time', Kp: 0 });
    expect(parsePlanetaryKpSeries(raw)).toEqual({ samples: [], rejectedRows: 9, supported: true });
    expect(parsePlanetaryKpSeries({ unexpected: [] }).supported).toBe(false);
  });

  it('preserves the actual early-week Kp peak when X-rays fail independently', async () => {
    fetchMock.mockImplementation(async input => String(input).includes('k-index') ? json(kpRows) : new Response('', { status: 503 }));
    const result = await fetchSpaceWeatherSummary(WINDOW);
    expect(result.data?.peakKpObserved).toBe(8);
    expect(result.data?.recentXrayClass).toBeNull();
    expect(result.sources.map(s => s.status)).toEqual(['complete', 'unavailable']);
    expect(result.sources[0].covered).toEqual([WINDOW]);
    expect(result.sources[0].observedUnits).toBe(56);
  });

  it('preserves X-rays when Kp fails and labels a truncated series as partial', async () => {
    fetchMock.mockImplementation(async input => String(input).includes('k-index') ? json({ unknown: [] }) : json([
      { energy: '0.1-0.8nm', time_tag: WINDOW.start, flux: 2e-5 },
      { energy: '0.05-0.4nm', time_tag: WINDOW.start, flux: 9 },
    ]));
    const result = await fetchSpaceWeatherSummary(WINDOW);
    expect(result.data?.peakKpObserved).toBeNull();
    expect(result.data?.recentXrayClass).toBe('M2.0');
    expect(result.sources.map(s => s.status)).toEqual(['unsupported', 'partial']);
  });

  it('excludes stale and future observations and the exclusive end boundary', async () => {
    fetchMock.mockResolvedValue(json([
      { time_tag: new Date(START - DAY_MS).toISOString(), Kp: 9 },
      { time_tag: WINDOW.end, Kp: 9 },
    ]));
    const result = await fetchSpaceWeatherSummary(WINDOW);
    expect(result.data).toBeNull();
    expect(result.sources[0].status).toBe('stale');
    expect(result.sources[0].observedUnits).toBe(0);
  });

  it('does not call a partially observed Kp peak a week maximum', async () => {
    fetchMock.mockImplementation(async input => String(input).includes('k-index') ? json(kpRows.slice(-8)) : json([]));
    const result = await fetchSpaceWeatherSummary(WINDOW);
    expect(result.data?.peakKpObserved).toBe(0);
    expect(result.sources[0]).toMatchObject({ status: 'partial', expectedUnits: 56, observedUnits: 8 });
    expect(result.sources[1]).toMatchObject({ status: 'unavailable', usable: false });
  });
});

describe('archive and forecast coverage', () => {
  it('counts six validated zero-report SPC days and leaves a 404 day unknown', async () => {
    fetchMock.mockImplementation(async input => String(input).includes('261007') ? new Response('', { status: 404 }) : new Response(HEADERS));
    const result = await fetchPastWeekReports(7, NOW);
    expect(result.data).toMatchObject({ total: 0, daysCovered: 6 });
    expect(result.sources.filter(s => s.status === 'complete')).toHaveLength(6);
    expect(result.sources.find(s => s.id === 'spc-2026-10-07')).toMatchObject({ usable: false, covered: [], status: 'unavailable' });
  });

  it('rejects HTML and malformed CSV without declaring a quiet day', async () => {
    fetchMock.mockResolvedValue(new Response('<html>temporarily unavailable</html>'));
    const result = await fetchPastWeekReports(1, NOW);
    expect(result.data).toBeNull();
    expect(result.sources[0].status).toBe('malformed');
  });

  it('resolves early-morning SPC reports to the next UTC date and preserves zero coordinates', async () => {
    fetchMock.mockResolvedValue(new Response(HEADERS.replace('Time,Speed', '0300,UNK,Place,County,TX,0,0,Report\nTime,Speed')));
    const result = await fetchPastWeekReports(1, NOW);
    expect(result.data?.reports[0]).toMatchObject({ time: '2026-10-11T03:00:00.000Z', lat: 0, lon: 0 });
  });

  it('counts a valid empty warning query as zero, but not a missing data property', async () => {
    fetchMock.mockResolvedValueOnce(json({ data: [] })).mockResolvedValueOnce(json({}));
    const empty = await fetchPastWeekWarnings(7, NOW);
    expect(empty.data?.totalWarnings).toBe(0);
    expect(empty.sources[0].status).toBe('complete');
    expect((await fetchPastWeekWarnings(7, NOW)).data).toBeNull();
  });

  it('deduplicates warning polygons and excludes events issued outside the window', async () => {
    const row = { utc_issue: kpRows[1].time_tag, utc_expire: kpRows[2].time_tag, wfo: 'MOB', phenomena: 'MA', significance: 'W', eventid: 225 };
    fetchMock.mockResolvedValue(json({ data: [row, row, { ...row, utc_issue: new Date(START - DAY_MS).toISOString(), eventid: 224 }] }));
    const result = await fetchPastWeekWarnings(7, NOW);
    expect(result.data?.totalWarnings).toBe(1);
    expect(result.sources[0].requested).toEqual(WINDOW);
  });

  it('keeps independent earthquake query failure unknown and explicitly requests the report window', async () => {
    fetchMock.mockImplementation(async input => String(input).includes('minsig=601') ? new Response('', { status: 502 }) : json({ type: 'FeatureCollection', features: [] }));
    const result = await fetchPastWeekQuakes(WINDOW);
    expect(result.data).toMatchObject({ significantCount: null, m45PlusCount: 0, largest: null });
    const query = new URL(String(fetchMock.mock.calls[0][0]));
    expect(query.searchParams.get('starttime')).toBe(WINDOW.start);
    expect(query.searchParams.get('endtime')).toBe('2026-10-11T11:59:59.999Z');
  });

  it('marks invalid earthquake times as partial instead of crashing or declaring zero', async () => {
    fetchMock.mockImplementation(async () => json({ type: 'FeatureCollection', features: [{ id: 'a', properties: { time: 'bad', mag: 5 } }] }));
    const result = await fetchPastWeekQuakes(WINDOW);
    expect(result.data).toBeNull();
    expect(result.sources.every(s => s.status === 'partial' && !s.usable)).toBe(true);
  });

  it('keeps the other city forecasts when one fails and rejects missing daily values', async () => {
    fetchMock.mockImplementation(async input => {
      const url = new URL(String(input));
      if (url.searchParams.get('latitude') === '40.71') throw new Error('timeout');
      const days = Array.from({ length: 7 }, (_, i) => new Date(Date.parse('2026-10-11T00:00:00Z') + i * DAY_MS).toISOString().slice(0, 10));
      return json({ utc_offset_seconds: 0, daily_units: { temperature_2m_max: '°F', temperature_2m_min: '°F', precipitation_sum: 'inch', precipitation_probability_max: '%' }, daily: {
        time: days, temperature_2m_max: [null, 60, 60, 60, 60, 60, 60], temperature_2m_min: days.map(() => 40),
        precipitation_sum: days.map(() => 0), precipitation_probability_max: days.map(() => 0), weather_code: days.map(() => 0),
      } });
    });
    const result = await fetchForecastOutlook(NOW);
    expect(result.data?.conusQuadrants).toHaveLength(5);
    expect(result.data?.international).toHaveLength(3);
    expect(result.data?.international[0].daily).toHaveLength(6);
    expect(result.data?.international[0].daily[0].precipIn).toBe(0);
    expect(result.sources[0].status).toBe('unavailable');
    expect(result.sources[1]).toMatchObject({ status: 'partial', observedUnits: 6 });
  });

  it('preserves a fatal audit when every source fails, without zero-valued narrative inputs', async () => {
    fetchMock.mockRejectedValue(new Error('offline'));
    const result = await collectSundayEvidence(NOW);
    expect(coverageOutcome(result.coverage)).toBe('fatal');
    expect(result).toMatchObject({ warnings: null, spcSummary: null, spaceSummary: null, quakeSummary: null, forecast: null });
    expect(result.coverage.sources).toHaveLength(21);
    const prompt = formatSundayEvidence(result);
    expect(prompt).toContain('null means unavailable');
    expect(prompt).not.toContain('"total":0');
    const onAudit = jest.fn();
    await expect(runSunday(onAudit)).rejects.toThrow(/No usable observations/);
    expect(onAudit).toHaveBeenCalledWith(expect.objectContaining({ sources: expect.any(Array) }));
    expect(callAnthropic).not.toHaveBeenCalled();
  });
});
