/** NOAA/WPC national forecast discussions, separate from city point forecasts. */
import { DAY_MS } from '@/lib/newsletter/coverage';
import { collectSource } from './source';
import type { ReportingWindow } from '@/lib/newsletter/coverage';
import type { Collected, ParsedSource } from './source';

export interface NationalDiscussion {
  label: string;
  url: string;
  issuedAt: string;
  valid: ReportingWindow;
  text: string;
}

export interface NationalOutlook {
  shortRange: NationalDiscussion | null;
  mediumRange: NationalDiscussion | null;
}

const PRODUCTS = [
  {
    id: 'wpc-short-range',
    label: 'NOAA/WPC Short Range Forecast Discussion',
    title: 'Short Range Forecast Discussion',
    url: 'https://www.wpc.ncep.noaa.gov/discussions/pmdspdbody.txt',
    startDays: 0,
    endDays: 1.5,
  },
  {
    id: 'wpc-medium-range',
    label: 'NOAA/WPC Extended Forecast Discussion',
    title: 'Extended Forecast Discussion',
    url: 'https://www.wpc.ncep.noaa.gov/discussions/pmdepdbody.txt',
    startDays: 3,
    endDays: 6,
  },
] as const;

const MONTHS = new Map([
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
].map((month, index) => [month, index]));

/** Each product is checked against a distinct part of the coming week. */
export async function fetchNationalOutlook(now = new Date()): Promise<Collected<NationalOutlook>> {
  const results = await Promise.all(PRODUCTS.map(product => {
    const requested = {
      start: new Date(now.getTime() + product.startDays * DAY_MS).toISOString(),
      end: new Date(now.getTime() + product.endDays * DAY_MS).toISOString(),
    };
    return collectSource({
      id: product.id, label: product.label, url: product.url,
      requested, unit: 'forecast discussion',
    }, raw => parseDiscussion(raw, product, requested, now), true);
  }));

  const [shortRange, mediumRange] = results.map(result => result.data);
  return {
    data: shortRange || mediumRange ? { shortRange, mediumRange } : null,
    sources: results.map(result => result.audit),
  };
}

function parseDiscussion(
  raw: unknown,
  product: (typeof PRODUCTS)[number],
  requested: ReportingWindow,
  now: Date,
): ParsedSource<NationalDiscussion> {
  if (typeof raw !== 'string') throw new SyntaxError('Expected WPC text');
  const text = raw.replace(/\r\n?/g, '\n').trim();
  if (!text.startsWith(product.title) || !text.includes('NWS Weather Prediction Center College Park MD') || text.length < 200 || text.length > 20_000) {
    throw new SyntaxError('Unexpected WPC discussion');
  }
  const issueLine = text.split('\n').find(line => /\b(?:AM|PM)\s+(?:EDT|EST)\b/.test(line));
  const validLine = text.split('\n').find(line => /^Valid\s+\d{1,2}Z\b/.test(line));
  if (!issueLine || !validLine) throw new SyntaxError('Missing issue or valid time');
  const issuedAt = parseEasternIssueTime(issueLine);
  const valid = parseValidWindow(validLine);
  if (Date.parse(valid.end) - Date.parse(valid.start) > 10 * DAY_MS) throw new SyntaxError('Invalid WPC forecast span');

  const issueTime = Date.parse(issuedAt);
  const age = now.getTime() - issueTime;
  const times = [issuedAt];
  if (age < -5 * 60_000 || age > 18 * 60 * 60_000) {
    return { data: null, records: 0, times, covered: [], status: 'stale', reasons: ['Discussion was not issued within the current forecast cycle'] };
  }

  const coveredStart = Math.max(Date.parse(valid.start), Date.parse(requested.start));
  const coveredEnd = Math.min(Date.parse(valid.end), Date.parse(requested.end));
  if (coveredStart >= coveredEnd) {
    return { data: null, records: 0, times, covered: [], status: 'stale', reasons: ['Discussion does not overlap the requested outlook dates'] };
  }
  const covered = [{ start: new Date(coveredStart).toISOString(), end: new Date(coveredEnd).toISOString() }];
  const complete = coveredStart === Date.parse(requested.start) && coveredEnd === Date.parse(requested.end);
  return {
    data: { label: product.label, url: product.url, issuedAt, valid, text },
    records: 1, times, covered, expectedUnits: 1, observedUnits: 1,
    snapshot: text,
    status: complete ? 'complete' : 'partial',
    reasons: complete ? [] : ['Discussion covers only part of the expected national forecast segment'],
  };
}

function parseEasternIssueTime(line: string): string {
  const match = line.trim().match(/^(\d{1,2})(\d{2})\s+(AM|PM)\s+(EDT|EST)\s+\w{3}\s+(\w{3})\s+(\d{1,2})\s+(\d{4})$/);
  if (!match) throw new SyntaxError('Invalid WPC issue time');
  const [, hourText, minuteText, meridiem, zone, monthText, dayText, yearText] = match;
  const month = MONTHS.get(monthText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  if (month === undefined || hour < 1 || hour > 12 || minute > 59) throw new SyntaxError('Invalid WPC issue date');
  const easternHour = hour % 12 + (meridiem === 'PM' ? 12 : 0);
  const utc = Date.UTC(Number(yearText), month, Number(dayText), easternHour + (zone === 'EDT' ? 4 : 5), minute);
  return checkedUtcDate(utc, Number(yearText), month, Number(dayText), zone === 'EDT' ? 4 : 5);
}

function parseValidWindow(line: string): ReportingWindow {
  const match = line.trim().match(/^Valid\s+(\d{1,2})Z\s+\w{3}\s+(\w{3})\s+(\d{1,2})\s+(\d{4})\s+-\s+(\d{1,2})Z\s+\w{3}\s+(\w{3})\s+(\d{1,2})\s+(\d{4})$/);
  if (!match) throw new SyntaxError('Invalid WPC valid window');
  const start = parseUtcHour(match[1], match[2], match[3], match[4]);
  const end = parseUtcHour(match[5], match[6], match[7], match[8]);
  if (start >= end) throw new SyntaxError('Reversed WPC valid window');
  return { start, end };
}

function parseUtcHour(hourText: string, monthText: string, dayText: string, yearText: string): string {
  const month = MONTHS.get(monthText);
  const hour = Number(hourText);
  if (month === undefined || hour > 23) throw new SyntaxError('Invalid WPC valid date');
  const year = Number(yearText);
  const day = Number(dayText);
  return checkedUtcDate(Date.UTC(year, month, day, hour), year, month, day, 0);
}

function checkedUtcDate(time: number, year: number, month: number, day: number, offsetHours: number): string {
  const local = new Date(time - offsetHours * 60 * 60_000);
  if (local.getUTCFullYear() !== year || local.getUTCMonth() !== month || local.getUTCDate() !== day) {
    throw new SyntaxError('Invalid WPC calendar date');
  }
  return new Date(time).toISOString();
}
