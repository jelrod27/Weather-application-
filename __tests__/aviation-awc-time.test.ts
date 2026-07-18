import { awcAlertId, formatAwcTime } from '@/lib/services/aviation-noaa-service';

describe('formatAwcTime', () => {
  it('treats unix seconds as seconds (not ms)', () => {
    // 2026-07-17T22:55:00Z
    expect(formatAwcTime(1784328900)).toBe('2026-07-17 22:55Z');
  });

  it('accepts ISO strings', () => {
    expect(formatAwcTime('2026-07-17T22:55:00.000Z')).toBe('2026-07-17 22:55Z');
  });

  it('returns empty for missing values', () => {
    expect(formatAwcTime(undefined)).toBe('');
    expect(formatAwcTime(null)).toBe('');
  });
});

describe('awcAlertId', () => {
  it('prefers seriesId over missing airsigmetId', () => {
    expect(
      awcAlertId('SIGMET', {
        seriesId: '11E',
        icaoId: 'KKCI',
        validTimeFrom: 1784328900,
        validTimeTo: 1784336100,
        rawAirSigmet: '',
        hazard: 'CONVECTIVE',
        severity: 5,
        airsigmetType: 'SIGMET',
        altitudeLow1: 0,
        altitudeHi1: 450,
      }),
    ).toBe('sigmet-11E');
  });

  it('does not emit sigmet-undefined when airsigmetId is absent', () => {
    const id = awcAlertId('SIGMET', {
      icaoId: 'KKCI',
      validTimeFrom: 1784328900,
      validTimeTo: 1784336100,
      rawAirSigmet: '',
      hazard: 'CONVECTIVE',
      severity: 5,
      airsigmetType: 'SIGMET',
      altitudeLow1: 0,
      altitudeHi1: 450,
    });
    expect(id).not.toContain('undefined');
    expect(id).toBe('sigmet-KKCI-1784328900');
  });
});
