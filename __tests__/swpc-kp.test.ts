import { parseKpForecast, parsePlanetaryKpIndex } from '@/lib/services/swpc-kp';

describe('parsePlanetaryKpIndex', () => {
  it('parses modern object rows from NOAA SWPC', () => {
    const payload = [
      { time_tag: '2026-07-17T12:00:00', Kp: 1.33, a_running: 5, station_count: 6 },
      { time_tag: '2026-07-17T15:00:00', Kp: 2.0, a_running: 7, station_count: 8 },
      { time_tag: '2026-07-17T18:00:00', Kp: 1.0, a_running: 4, station_count: 6 },
    ];

    const parsed = parsePlanetaryKpIndex(payload);
    expect(parsed.current).toEqual({ timeTag: '2026-07-17T18:00:00', kp: 1.0 });
    expect(parsed.recent).toHaveLength(3);
  });

  it('parses legacy array rows with a header', () => {
    const payload = [
      ['time_tag', 'Kp', 'a_running', 'station_count'],
      ['2026-07-17T12:00:00', '2.33', '12', '8'],
      ['2026-07-17T15:00:00', '3.00', '15', '8'],
    ];

    const parsed = parsePlanetaryKpIndex(payload);
    expect(parsed.current).toEqual({ timeTag: '2026-07-17T15:00:00', kp: 3 });
    expect(parsed.recent).toHaveLength(2);
  });

  it('returns null current for empty payloads', () => {
    expect(parsePlanetaryKpIndex([])).toEqual({ current: null, recent: [] });
  });
});

describe('parseKpForecast', () => {
  it('averages object forecast rows', () => {
    const payload = [
      { time_tag: '2026-07-17T21:00:00', kp: 2.0, observed: 'predicted' },
      { time_tag: '2026-07-18T00:00:00', kp: 4.0, observed: 'predicted' },
    ];
    expect(parseKpForecast(payload)).toEqual({ expected: 3, maxExpected: 4 });
  });
});
