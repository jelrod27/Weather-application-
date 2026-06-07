/**
 * Tests for Stargazer Kp index parsing (NOAA SWPC payload shapes)
 */

import {
  parseKpRow,
  parseKpTimeTag,
  parseKpEntry,
  extractCurrentKp,
  extractForecastMaxKp,
} from '@/lib/stargazer/space-environment';

describe('parseKpRow', () => {
  it('reads the current object shape ({ Kp })', () => {
    expect(parseKpRow({ time_tag: '2026-06-07T12:00:00', Kp: 3.67 })).toBe(3.67);
  });

  it('reads the forecast object shape ({ kp })', () => {
    expect(parseKpRow({ time_tag: '2026-06-07T12:00:00', kp: 5.33 })).toBe(5.33);
  });

  it('reads the legacy array shape ([time_tag, Kp, ...])', () => {
    expect(parseKpRow(['2026-06-07T12:00:00', '4.00', 27, 8])).toBe(4);
  });

  it('returns null for the header row or junk', () => {
    expect(parseKpRow(['time_tag', 'Kp', 'a_running', 'station_count'])).toBeNull();
    expect(parseKpRow({ time_tag: '2026-06-07T12:00:00' })).toBeNull();
    expect(parseKpRow(null)).toBeNull();
  });
});

describe('parseKpTimeTag', () => {
  it('reads time_tag from the object shape', () => {
    expect(parseKpTimeTag({ time_tag: '2026-06-07T12:00:00', Kp: 2 })).toBe('2026-06-07T12:00:00');
  });

  it('reads index 0 from the array shape', () => {
    expect(parseKpTimeTag(['2026-06-07T12:00:00', '2', 7, 8])).toBe('2026-06-07T12:00:00');
  });

  it('returns empty string when absent', () => {
    expect(parseKpTimeTag({ Kp: 2 })).toBe('');
    expect(parseKpTimeTag(null)).toBe('');
  });
});

describe('parseKpEntry', () => {
  it('builds a { timeTag, kp } entry from the object shape', () => {
    expect(parseKpEntry({ time_tag: '2026-06-07T12:00:00', Kp: 3.67 })).toEqual({
      timeTag: '2026-06-07T12:00:00',
      kp: 3.67,
    });
  });

  it('returns null for the legacy header row', () => {
    expect(parseKpEntry(['time_tag', 'Kp', 'a_running', 'station_count'])).toBeNull();
  });
});

describe('extractCurrentKp', () => {
  it('returns the most recent numeric Kp', () => {
    const rows = [
      { time_tag: '2026-06-07T06:00:00', Kp: 2.0 },
      { time_tag: '2026-06-07T09:00:00', Kp: 2.67 },
      { time_tag: '2026-06-07T12:00:00', Kp: 1.67 },
    ];
    expect(extractCurrentKp(rows)).toBe(1.67);
  });

  it('skips trailing non-numeric rows', () => {
    const rows = [{ Kp: 3.0 }, { time_tag: 'x' }];
    expect(extractCurrentKp(rows)).toBe(3.0);
  });

  it('returns null for non-array input', () => {
    expect(extractCurrentKp(null)).toBeNull();
  });
});

describe('extractForecastMaxKp', () => {
  it('prefers predicted rows and returns their max', () => {
    const rows = [
      { time_tag: '2026-06-06T00:00:00', kp: 6.33, observed: 'observed' },
      { time_tag: '2026-06-07T12:00:00', kp: 2.0, observed: 'predicted' },
      { time_tag: '2026-06-07T15:00:00', kp: 4.33, observed: 'predicted' },
    ];
    // 6.33 is observed (past), so it must be ignored; max of predicted is 4.33.
    expect(extractForecastMaxKp(rows)).toBe(4.33);
  });

  it('falls back to all rows when none are flagged predicted', () => {
    const rows = [{ kp: 2.0 }, { kp: 5.0 }];
    expect(extractForecastMaxKp(rows)).toBe(5.0);
  });

  it('returns null when nothing parses', () => {
    expect(extractForecastMaxKp([])).toBeNull();
    expect(extractForecastMaxKp(null)).toBeNull();
  });
});
