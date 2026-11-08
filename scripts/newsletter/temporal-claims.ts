/** Deterministic checks for explicit calendar claims and aggregate SPC local clocks.
 * This is a bounded consistency gate, not a general weather fact checker.
 */
import { z } from 'zod';
import { splitSentences } from './post-header';
import { coverageDisclosure } from '@/lib/newsletter/coverage';
import type { CoverageAudit } from '@/lib/newsletter/coverage';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTH_PATTERN = MONTHS.join('|');
const WEEKDAY_PATTERN = WEEKDAYS.join('|');

// Only unambiguous statewide zones are included. Split-zone states need an
// exact location; a state abbreviation alone cannot establish their local clock.
const STATE_ZONES: Record<string, string> = Object.fromEntries([
  ['America/Chicago', 'AL AR IL IA LA MN MS MO WI'],
  ['America/Denver', 'CO MT UT WY'],
  ['America/Los_Angeles', 'CA WA'],
  ['Pacific/Honolulu', 'HI'],
  ['America/New_York', 'CT DE DC GA ME MD MA NH NJ NY NC OH PA RI SC VT VA WV'],
].flatMap(([zone, states]) => states.split(' ').map(state => [state, zone])));

const clockSchema = z.object({
  kind: z.literal('spc-local-clocks-v1'),
  localHours: z.array(z.number().int().min(0).max(23)),
  utcHours: z.array(z.number().int().min(0).max(23)),
  localDates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  unknownTimeZones: z.number().int().nonnegative(),
}).strict();
export type ReportClockSummary = z.infer<typeof clockSchema>;

/** Clock evidence for the entire validated report day, not just prompt examples. */
export function summarizeReportClocks(reports: ReadonlyArray<{ time: string; state: string }>): ReportClockSummary {
  const hours = new Set<number>();
  const dates = new Set<string>();
  const utcHours = new Set<number>();
  let unknownTimeZones = 0;
  for (const report of reports) {
    const timeZone = STATE_ZONES[report.state];
    const instant = new Date(report.time);
    if (Number.isFinite(instant.getTime())) utcHours.add(instant.getUTCHours());
    if (!timeZone || !Number.isFinite(instant.getTime())) { unknownTimeZones++; continue; }
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' }).formatToParts(instant);
    const value = (type: Intl.DateTimeFormatPartTypes): string => parts.find(part => part.type === type)!.value;
    hours.add(Number(value('hour')));
    dates.add(`${value('year')}-${value('month')}-${value('day')}`);
  }
  return { kind: 'spc-local-clocks-v1', localHours: [...hours].sort((a, b) => a - b), utcHours: [...utcHours].sort((a, b) => a - b), localDates: [...dates].sort(), unknownTimeZones };
}

function readClocks(snapshot: string | undefined): ReportClockSummary | null {
  if (!snapshot) return null;
  try {
    const parsed = clockSchema.safeParse(JSON.parse(snapshot));
    return parsed.success ? parsed.data : null;
  } catch { return null; }
}

function proseOnly(markdown: string, audit: CoverageAudit): string {
  let fence: string | null = null;
  // Only the exact audit-bound trailing disclosure is reference material.
  // A model-written heading must never hide the rest of its article.
  const disclosure = coverageDisclosure(audit);
  const trimmed = markdown.trimEnd();
  const article = trimmed.endsWith(disclosure) ? trimmed.slice(0, -disclosure.length) : markdown;
  // Mask comments without joining surrounding tokens or recreating delimiters.
  // Preserve newlines so quote/fence boundaries keep their original meaning.
  return article.replace(/<!--[\s\S]*?-->/g, comment => comment.replace(/[^\r\n]/g, ' ')).split(/\r?\n/).filter(line => {
    const marker = /^\s*(`{3,}|~{3,})/.exec(line)?.[1];
    if (marker) {
      if (!fence) fence = marker[0];
      else if (fence === marker[0]) fence = null;
      return false;
    }
    return !fence && !/^\s*>/.test(line);
  }).join('\n');
}

function validDate(year: number, month: number, day: number): Date | null {
  const date = new Date(Date.UTC(year, month, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month && date.getUTCDate() === day ? date : null;
}

function inferYear(month: number, day: number, reference: Date): number {
  const year = reference.getUTCFullYear();
  return [year - 1, year, year + 1].sort((a, b) => Math.abs(Date.UTC(a, month, day) - reference.getTime()) - Math.abs(Date.UTC(b, month, day) - reference.getTime()))[0];
}

/** Supported forms include Thursday (November 12), and Thursday–Friday
 * (November 12–13). Unqualified years use the nearest edition calendar date.
 */
export function temporalClaimErrors(markdown: string, audit: CoverageAudit): string[] {
  const prose = proseOnly(markdown, audit);
  const reference = new Date(audit.generatedAt);
  if (!Number.isFinite(reference.getTime())) return ['Temporal validation requires a valid edition timestamp'];
  const errors: string[] = [];
  const pair = new RegExp(`\\b(${WEEKDAY_PATTERN})(?:\\s*(?:through|into|to|and|[–—/-])\\s*(${WEEKDAY_PATTERN}))?\\s*(?:[,\\(]\\s*)?(${MONTH_PATTERN})\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s+(\\d{4}))?(?:\\s*(through|to|[–—-])\\s*(?:(${MONTH_PATTERN})\\s+)?(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s+(\\d{4}))?)?\\b`, 'gi');
  for (const match of prose.matchAll(pair)) {
    const [, startWeekday, endWeekday, startMonth, startDay, startYear, rangeSeparator, endMonth, endDay, endYear] = match;
    const month = MONTHS.findIndex(name => name.toLowerCase() === startMonth.toLowerCase());
    const lastMonth = endMonth ? MONTHS.findIndex(name => name.toLowerCase() === endMonth.toLowerCase()) : month;
    const rollsYear = lastMonth < month ? 1 : 0;
    const year = startYear ? Number(startYear) : endYear ? Number(endYear) - rollsYear : inferYear(month, Number(startDay), reference);
    const start = validDate(year, month, Number(startDay));
    // A spaced em dash introduces a prose aside unless another calendar
    // qualifier identifies its number as a range end. Keep validating bare
    // endpoints after calendar separators such as en dashes and "through".
    const proseAside = rangeSeparator === '—' && /\s—\s/.test(match[0]);
    const hasRangeEnd = Boolean(endDay && (!proseAside || endWeekday || endMonth || endYear));
    const end = hasRangeEnd ? validDate(endYear ? Number(endYear) : year + rollsYear, lastMonth, Number(endDay)) : null;
    if (!start || (hasRangeEnd && (!end || end < start))) {
      errors.push(`Invalid date in explicit calendar claim: ${match[0]}`);
      continue;
    }
    const expected = [WEEKDAYS[start.getUTCDay()], ...(endWeekday && end ? [WEEKDAYS[end.getUTCDay()]] : [])];
    if (startWeekday.toLowerCase() !== expected[0].toLowerCase() ||
        (endWeekday && (!end || endWeekday.toLowerCase() !== expected[1]?.toLowerCase()))) {
      errors.push(`Calendar claim "${match[0]}" disagrees with its dates; expected ${expected.join('–')}${endWeekday && !end ? ' with an explicit end date' : ''}`);
    }
  }

  const datePattern = new RegExp(`\\b(${MONTH_PATTERN})\\s+(\\d{1,2})(?:,?\\s+(\\d{4}))?\\b`, 'i');
  const fitsPart = (hour: number, part: string): boolean => {
    if (part === 'morning') return hour < 12;
    if (part === 'afternoon') return hour >= 12 && hour < 18;
    if (part === 'evening') return hour >= 18;
    // "Overnight" can include the preceding evening and following morning.
    return hour >= 18 || hour < 12;
  };
  for (const paragraph of prose.split(/\n\s*\n/)) {
    for (const sentence of splitSentences(paragraph)) {
      if (!/\bSPC\b/i.test(sentence) || !/\b(?:log|reports?)\b/i.test(sentence) || /\bnot\s+(?:all|only)\b/i.test(sentence)) continue;
      // Quantifiers must modify the clock phrase, not an unrelated report
      // count such as "only two reports; the first was in the morning".
      const broad = /\b(?:all|only|entirely)(?:\s+(?:of\s+the\s+)?reports?)?(?:\s+(?:were|occurred|arrived|fell|came|happened|recorded)){0,2}(?:\s+(?:in|during|within|at))?(?:\s+the)?\s+(morning|afternoon|evening|overnight)\b/i.exec(sentence);
      if (!broad || [...sentence.matchAll(/\b(?:morning|afternoon|evening|overnight)\b/gi)].length !== 1) continue;
      const date = datePattern.exec(sentence);
      if (!date) continue; // No uniquely identified report day to compare.
      const month = MONTHS.findIndex(name => name.toLowerCase() === date[1].toLowerCase());
      const year = date[3] ? Number(date[3]) : inferYear(month, Number(date[2]), reference);
      const day = validDate(year, month, Number(date[2]));
      if (!day) { errors.push(`Invalid date in SPC report-day claim: ${date[0]}`); continue; }
      const id = `spc-${day.toISOString().slice(0, 10)}`;
      const source = audit.sources.find(item => item.id === id);
      const clocks = readClocks(source?.snapshot);
      const local = /\blocal(?:\s+time)?\b|\b(?:[ECMP][DS]T|HST)\b/i.test(sentence);
      const utc = /\bUTC\b/i.test(sentence) && !local;
      if (!source || source.status !== 'complete' || !clocks || (!local && !utc) || (local && clocks.unknownTimeZones > 0)) {
        errors.push(`Cannot validate the aggregate SPC clock claim for ${id}; use exact source UTC times instead of an unsupported all-local description`);
        continue;
      }
      const hours = local ? clocks.localHours : clocks.utcHours;
      if (!hours.length || !hours.every(hour => fitsPart(hour, broad[1].toLowerCase()))) {
        errors.push(`SPC ${local ? 'local' : 'UTC'} clock claim for ${id} contradicts the saved report times: ${broad[0]}`);
      }
    }
  }
  return [...new Set(errors)];
}

export function temporalReference(audit: CoverageAudit, forecastDates: readonly string[]): {
  forecastTimeZone: string;
  forecastDays: Array<{ date: string; weekday: string }>;
  spcReportClocks: Array<{ reportDay: string; clocks: ReportClockSummary | null }>;
} {
  return {
    forecastTimeZone: 'UTC',
    forecastDays: [...new Set(forecastDates)].sort().map(date => ({ date, weekday: WEEKDAYS[new Date(`${date}T00:00:00Z`).getUTCDay()] })),
    spcReportClocks: audit.sources.filter(source => /^spc-\d{4}-\d{2}-\d{2}$/.test(source.id)).map(source => ({ reportDay: source.id.slice(4), clocks: readClocks(source.snapshot) })),
  };
}
