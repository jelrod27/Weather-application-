/** @jest-environment node */
import { fetchPastWeekReports } from '../../scripts/newsletter/data/spc-reports';
import { formatSundayEvidence } from '../../scripts/newsletter/data/sunday-evidence';
import type { SundayEvidence } from '../../scripts/newsletter/data/sunday-evidence';

afterEach(() => jest.restoreAllMocks());

it('records clock evidence for every validated report, including reports outside the prompt example cap', async () => {
  const csv = [
    'Time,F_Scale,Location,County,State,Lat,Lon,Comments',
    'Time,Speed,Location,County,State,Lat,Lon,Comments',
    ...Array.from({ length: 20 }, () => '1908,UNK,Location,County,MO,39.29,-92.4,Report'),
    '1610,UNK,Location,County,LA,32.54,-93.41,Report',
    'Time,Size,Location,County,State,Lat,Lon,Comments',
  ].join('\n');
  jest.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(csv));
  const result = await fetchPastWeekReports(1, new Date('2026-11-04T12:05:00Z'));
  expect(result.data?.total).toBe(21);
  expect(JSON.parse(result.sources[0].snapshot!)).toMatchObject({ kind: 'spc-local-clocks-v1', localHours: [10, 13], utcHours: [16, 19], unknownTimeZones: 0 });
  const coverage = { version: 1 as const, cadence: 'sunday_rearview' as const, generatedAt: '2026-11-08T17:40:00.000Z', window: result.sources[0].requested, sources: result.sources };
  const evidence: SundayEvidence = { coverage, warnings: null, spcSummary: result.data, spaceSummary: null, quakeSummary: null, national: null,
    forecast: { conusQuadrants: [{ region: 'NYC', lat: 40.71, lon: -74, daily: [{ date: '2026-11-12', tMaxF: 61, tMinF: 54, precipIn: 0.4, precipProb: 44, weatherCode: 81 }] }], international: [], fetchedAt: coverage.generatedAt } };
  const prompt = formatSundayEvidence(evidence);
  const context = JSON.parse(prompt.slice(prompt.lastIndexOf('\n\n') + 2));
  expect(context.spcSummary.reports).toHaveLength(20);
  expect(context.temporalReference.spcReportClocks[0].clocks.localHours).toEqual([10, 13]);
  expect(context.temporalReference.forecastDays).toEqual([{ date: '2026-11-12', weekday: 'Thursday' }]);
});
