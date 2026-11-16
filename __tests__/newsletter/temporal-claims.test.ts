/** @jest-environment node */
import { normalizeCalendarWeekdays, summarizeReportClocks, temporalClaimErrors, temporalReference } from '../../scripts/newsletter/temporal-claims';
import type { CoverageAudit } from '@/lib/newsletter/coverage';
import { coverageDisclosure } from '@/lib/newsletter/coverage';

const reports = [
  { time: '2026-11-03T16:10:00.000Z', state: 'MO' },
  { time: '2026-11-03T19:08:00.000Z', state: 'LA' },
];
function audit(snapshot = summarizeReportClocks(reports)): CoverageAudit {
  const window = { start: '2026-11-03T12:00:00.000Z', end: '2026-11-04T12:00:00.000Z' };
  return {
    version: 1, cadence: 'sunday_rearview', generatedAt: '2026-11-08T17:40:00.000Z', window,
    sources: [{ id: 'spc-2026-11-03', label: 'SPC preliminary reports', url: 'https://www.spc.noaa.gov/climo/reports/261103_rpts.csv',
      retrievedAt: '2026-11-08T17:40:00.000Z', requested: window, covered: [window], records: 2,
      usable: true, status: 'complete', reasons: [], observationStart: reports[0].time, observationEnd: reports[1].time,
      unit: 'report days', snapshot: JSON.stringify(snapshot) }],
  };
}

describe('generation-time weekday correction', () => {
  function editionAudit(): CoverageAudit {
    const context = audit();
    return {
      ...context,
      generatedAt: '2026-11-15T18:31:48.000Z',
      window: { start: '2026-11-08T12:00:00.000Z', end: '2026-11-15T12:00:00.000Z' },
    };
  }

  it.each([
    ['Tuesday, November 11', 'Wednesday, November 11'],
    ['Tuesday (November 11, 2026)', 'Wednesday (November 11, 2026)'],
    ['Wednesday into Thursday (November 12–13)', 'Thursday into Friday (November 12–13)'],
    ['Tuesday, November 11 and Wednesday, November 12', 'Wednesday, November 11 and Thursday, November 12'],
    ['Saturday, November 8 through November 15', 'Sunday, November 8 through November 15'],
  ])('corrects explicit edition weekdays while preserving dates: %s', (draft, expected) => {
    const context = editionAudit();
    const corrected = normalizeCalendarWeekdays(draft, context);
    expect(corrected).toBe(expected);
    expect(temporalClaimErrors(corrected, context)).toEqual([]);
    expect(normalizeCalendarWeekdays(corrected, context)).toBe(corrected);
    // The publication gate still rejects the original model output.
    expect(temporalClaimErrors(draft, context)).not.toEqual([]);
  });

  it.each([
    'wednesday, november 11',
    'Monday, January 17, 1994',
    'Tuesday, November 11, 2025',
    'Tuesday, November 25',
    'Friday (February 30, 2026)',
    'Thursday–Friday (November 12–40)',
    'Thursday (November 12–November 5)',
    'Tuesday into Wednesday (November 11)',
  ])('preserves correct labels and does not guess unsupported repairs: %s', draft => {
    expect(normalizeCalendarWeekdays(draft, editionAudit())).toBe(draft);
  });

  it('keeps unsupported SPC clock claims blocked after repairing a weekday', () => {
    const draft = 'Tuesday, November 11 SPC reports were all in the morning local time.';
    const corrected = normalizeCalendarWeekdays(draft, editionAudit());
    expect(corrected).toBe(draft.replace('Tuesday', 'Wednesday'));
    expect(temporalClaimErrors(corrected, editionAudit()).join(' ')).toMatch(/SPC/);
  });

  it('repairs forecast dates only when they are inside usable covered forecast intervals', () => {
    const context = editionAudit();
    const draft = 'Monday, November 17 brings rain.';
    expect(normalizeCalendarWeekdays(draft, context)).toBe(draft);
    const forecastWindow = { start: '2026-11-17T00:00:00.000Z', end: '2026-11-18T00:00:00.000Z' };
    context.sources.push({ ...context.sources[0], id: 'forecast-nyc', requested: forecastWindow, covered: [forecastWindow] });
    expect(normalizeCalendarWeekdays(draft, context)).toBe('Tuesday, November 17 brings rain.');
    context.sources[1].usable = false;
    expect(normalizeCalendarWeekdays(draft, context)).toBe(draft);
  });

  it('preserves code, quotes, comments, disclosures and CRLF offsets around identical prose', () => {
    const context = editionAudit();
    const bad = 'Tuesday, November 11';
    context.sources[0].label = bad;
    const prefix = `> ${bad}\r\n\r\n\`\`\`text\r\n${bad}\r\n\`\`\`\r\n<!-- ${bad} -->\r\n\r\n`;
    const suffix = '\r\n\r\n' + coverageDisclosure(context);
    expect(normalizeCalendarWeekdays(prefix + bad + suffix, context)).toBe(prefix + 'Wednesday, November 11' + suffix);
  });

  it('handles an edition spanning New Year without changing explicit years', () => {
    const context = { ...editionAudit(), generatedAt: '2027-01-03T12:00:00.000Z',
      window: { start: '2026-12-27T12:00:00.000Z', end: '2027-01-03T12:00:00.000Z' } };
    expect(normalizeCalendarWeekdays('Wednesday into Thursday (December 31, 2026–January 1, 2027)', context))
      .toBe('Thursday into Friday (December 31, 2026–January 1, 2027)');
  });
});

describe('supported explicit temporal claims', () => {
  it('rejects the published November 12–13 weekday contradiction', () => {
    expect(temporalClaimErrors('Rain arrives Wednesday into Thursday (November 12–13).', audit()).join(' ')).toMatch(/Thursday.*Friday/);
  });
  it('accepts correct weekdays, UTC bounds, and prose without an explicit date pair', () => {
    expect(temporalClaimErrors('Rain is forecast Thursday into Friday (November 12–13). The November 3 SPC log lists report times 16:10–19:08 UTC.', audit())).toEqual([]);
    expect(temporalClaimErrors('Models suggest rain later in the week.', audit())).toEqual([]);
  });
  it.each(['Rain arrives Wednesday (November 12).', 'Rain arrives Wednesday, November 12, 2026.'])('rejects an explicit single-date contradiction: %s', prose => {
    expect(temporalClaimErrors(prose, audit()).join(' ')).toContain('Thursday');
  });
  it('uses an explicit historical year rather than the edition year', () => {
    expect(temporalClaimErrors('Monday, January 17, 1994 brought the event.', audit())).toEqual([]);
  });
  it('resolves an unqualified cross-year range near the edition date', () => {
    const context = { ...audit(), generatedAt: '2025-12-30T12:00:00.000Z' };
    expect(temporalClaimErrors('Wednesday–Thursday (December 31–January 1) is unsettled.', context)).toEqual([]);
    expect(temporalClaimErrors('Wednesday–Friday (December 31–January 1) is unsettled.', context).join(' ')).toContain('Thursday');
  });
  it('accepts explicit years on both endpoints of a cross-year range', () => {
    expect(temporalClaimErrors('Thursday into Friday (December 31, 2026–January 1, 2027) brings rain.', audit())).toEqual([]);
  });
  it('rejects calendar rollover masquerading as a valid date', () => {
    expect(temporalClaimErrors('Monday (February 30, 2026) brings rain.', audit()).join(' ')).toMatch(/Invalid date/);
  });
  it.each(['Friday, November 13 — 5 percent chance of rain.', 'Thursday, November 12 — 40 mph gusts.'])('accepts a dated forecast followed by a numeric aside: %s', prose => {
    expect(temporalClaimErrors(prose, audit())).toEqual([]);
  });
  it.each(['Thursday–Friday (November 12–40).', 'Thursday (November 12–November 5).', 'Thursday (November 12–5, 2026).', 'Thursday (November 12–40).', 'Thursday, November 12 through 40.', 'Thursday (November 12–5).'])('still rejects an explicitly identified invalid range end: %s', prose => {
    expect(temporalClaimErrors(prose, audit()).join(' ')).toContain('Invalid date');
  });
  it('ignores quoted examples, fenced code, comments and the immutable source disclosure', () => {
    const context = audit();
    context.sources[0].label = 'Wednesday (November 12)';
    expect(temporalClaimErrors('> Wednesday (November 12) is a quoted error.\n\n```text\nWednesday (November 12)\n```\n<!-- Wednesday (November 12) -->\n' + coverageDisclosure(context), context)).toEqual([]);
  });
  it('keeps comments as prose boundaries instead of joining surrounding tokens', () => {
    expect(temporalClaimErrors('Wednes<!-- editorial note -->day (November 12).', audit())).toEqual([]);
    expect(temporalClaimErrors('Forecast<!-- editorial note -->Wednesday (November 12).', audit()).join(' ')).toContain('expected Thursday');
  });
  it('preserves line boundaries inside comments before excluding quoted examples', () => {
    expect(temporalClaimErrors('Visible prose<!-- editorial\nnote -->> Wednesday (November 12).', audit())).toEqual([]);
  });
  it('still checks article prose after an earlier source-coverage heading', () => {
    const context = audit();
    const prose = '## Source coverage\n\nA generated heading is not an exclusion boundary.\n\n## Roadmap\n\nRain arrives Wednesday into Thursday (November 12–13).\n\n' + coverageDisclosure(context);
    expect(temporalClaimErrors(prose, context).join(' ')).toMatch(/expected Thursday–Friday/);
  });
});

describe('SPC report-day local clock claims', () => {
  it('does not mistake a count qualifier for a claim about every report clock', () => {
    expect(temporalClaimErrors('The November 3 SPC log lists only two reports; the first arrived in the morning local time.', audit())).toEqual([]);
  });
  it('rejects both afternoon-only and morning-only accounts of the observed window', () => {
    for (const part of ['afternoon', 'morning']) {
      expect(temporalClaimErrors(`The November 3 SPC log recorded reports, all in the ${part} hours local time.`, audit()).join(' ')).toMatch(/local.*clock|clock.*local/i);
    }
  });
  it('accepts a complete all-afternoon local window when the source clock evidence supports it', () => {
    const snapshot = summarizeReportClocks([{ time: '2026-11-03T19:08:00.000Z', state: 'LA' }]);
    expect(temporalClaimErrors('The November 3 SPC log recorded reports, all in the afternoon hours local time.', audit(snapshot))).toEqual([]);
  });
  it('keeps unsupported state time zones unknown rather than guessing across a split-zone state', () => {
    const snapshot = summarizeReportClocks([{ time: '2026-11-03T19:08:00.000Z', state: 'TX' }]);
    expect(snapshot.unknownTimeZones).toBe(1);
    expect(temporalClaimErrors('The November 3 SPC log recorded reports, all in the afternoon hours local time.', audit(snapshot)).join(' ')).toMatch(/UTC/);
  });
  it('uses IANA daylight-saving transitions and local dates', () => {
    const summer = summarizeReportClocks([{ time: '2026-07-03T17:10:00.000Z', state: 'MO' }]);
    const winter = summarizeReportClocks([{ time: '2026-11-03T17:10:00.000Z', state: 'MO' }]);
    expect(summer.localHours).toEqual([12]);
    expect(winter.localHours).toEqual([11]);
    expect(summarizeReportClocks([{ time: '2026-11-03T02:10:00.000Z', state: 'CA' }]).localDates).toEqual(['2026-11-02']);
  });
  it('does not claim all-local coverage for incomplete or absent clock evidence', () => {
    const context = audit();
    context.sources[0].snapshot = undefined;
    expect(temporalClaimErrors('The November 3 SPC log recorded reports, all in the afternoon hours local time.', context).join(' ')).toMatch(/UTC/);
  });
  it('provides deterministic calendar references without inventing unknown local clocks', () => {
    expect(temporalReference(audit(), ['2026-11-12', '2026-11-13'])).toMatchObject({
      forecastTimeZone: 'UTC', forecastDays: [{ date: '2026-11-12', weekday: 'Thursday' }, { date: '2026-11-13', weekday: 'Friday' }],
    });
  });
});
