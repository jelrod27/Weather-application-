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
    // The clock is injected: the window is relative to now, so a fixed
    // fixture would otherwise start failing once it fell into the past.
    const payload = [
      { time_tag: '2026-07-17T21:00:00', kp: 2.0, observed: 'predicted' },
      { time_tag: '2026-07-18T00:00:00', kp: 4.0, observed: 'predicted' },
    ];
    const now = new Date('2026-07-17T21:30:00Z');
    expect(parseKpForecast(payload, now)).toEqual({ expected: 3, maxExpected: 4, blocks: 2 });
  });
});

describe('parseKpForecast selects the coming 24 hours', () => {
  const NOW = new Date('2026-09-08T01:00:00Z')

  /**
   * The forecast product leads with roughly a week of already-observed rows.
   * Taking the first eight returned last week's observations and presented
   * them as an outlook.
   */
  it('skips the observed history the feed leads with', () => {
    const payload = [
      { time_tag: '2026-09-01T00:00:00', kp: 1, observed: 'observed' },
      { time_tag: '2026-09-01T03:00:00', kp: 1.33, observed: 'observed' },
      { time_tag: '2026-09-02T00:00:00', kp: 2, observed: 'observed' },
      { time_tag: '2026-09-08T03:00:00', kp: 4, observed: 'predicted' },
      { time_tag: '2026-09-08T06:00:00', kp: 5, observed: 'predicted' },
    ]
    expect(parseKpForecast(payload, NOW)).toEqual({ expected: 4.5, maxExpected: 5, blocks: 2 })
  })

  it('keeps the three-hour block already in progress', () => {
    const payload = [
      { time_tag: '2026-09-08T00:00:00', kp: 6, observed: 'observed' },
      { time_tag: '2026-09-08T03:00:00', kp: 4, observed: 'predicted' },
    ]
    expect(parseKpForecast(payload, NOW)).toEqual({ expected: 5, maxExpected: 6, blocks: 2 })
  })

  it('caps the window at eight three-hour blocks', () => {
    const payload = Array.from({ length: 20 }, (_, i) => ({
      time_tag: new Date(NOW.getTime() + (i + 1) * 3 * 3600_000).toISOString(),
      kp: i < 8 ? 2 : 9,
      observed: 'predicted',
    }))
    expect(parseKpForecast(payload, NOW)).toEqual({ expected: 2, maxExpected: 2, blocks: 8 })
  })

  it('reports the block count so a caller can label the window', () => {
    // The aurora page turns this into "over the next N hours"; without it the
    // page had to re-derive the window and dropped the block in progress.
    const payload = [
      { time_tag: '2026-09-08T00:00:00', kp: 3, observed: 'observed' },
      { time_tag: '2026-09-08T03:00:00', kp: 4, observed: 'predicted' },
      { time_tag: '2026-09-08T06:00:00', kp: 5, observed: 'predicted' },
    ]
    expect(parseKpForecast(payload, NOW)?.blocks).toBe(3)
  })

  it('returns null when the payload holds nothing ahead', () => {
    const payload = [
      { time_tag: '2026-09-01T00:00:00', kp: 1, observed: 'observed' },
      { time_tag: '2026-09-02T00:00:00', kp: 2, observed: 'observed' },
    ]
    expect(parseKpForecast(payload, NOW)).toBeNull()
  })
})

describe('parsePlanetaryKpIndex selects by time, not array position', () => {
  /**
   * The planetary K-index product ships oldest-first today, but the sibling
   * RTSW feeds ship newest-first, and trusting position is what had the site
   * presenting a day-old solar wind speed as current. This value is the
   * headline Kp and the dateModified stamp on three indexed pages.
   */
  it('reads the newest sample whichever way the feed is ordered', () => {
    const rows = [
      { time_tag: '2026-09-08T00:00:00', Kp: 2 },
      { time_tag: '2026-09-08T09:00:00', Kp: 5 },
      { time_tag: '2026-09-08T03:00:00', Kp: 3 },
    ];

    expect(parsePlanetaryKpIndex(rows).current).toEqual({
      timeTag: '2026-09-08T09:00:00',
      kp: 5,
    });
    expect(parsePlanetaryKpIndex([...rows].reverse()).current?.kp).toBe(5);
  });

  it('returns recent oldest-first so a chart can render it directly', () => {
    const rows = [
      { time_tag: '2026-09-08T09:00:00', Kp: 5 },
      { time_tag: '2026-09-08T00:00:00', Kp: 2 },
      { time_tag: '2026-09-08T03:00:00', Kp: 3 },
    ];

    expect(parsePlanetaryKpIndex(rows).recent.map((s) => s.kp)).toEqual([2, 3, 5]);
  });

  it('keeps array order when no tag can be read, rather than emptying the UI', () => {
    const rows = [
      { time_tag: 'not-a-timestamp', Kp: 2 },
      { time_tag: 'also-not', Kp: 4 },
    ];

    expect(parsePlanetaryKpIndex(rows).current?.kp).toBe(4);
  });
});

describe('parseKpForecast window edges', () => {
  it('drops a block that has already ended', () => {
    // 00:00 closed at 03:00, ten minutes before now; only 03:00 is in play.
    const payload = [
      { time_tag: '2026-09-08T00:00:00', kp: 9, observed: 'observed' },
      { time_tag: '2026-09-08T03:00:00', kp: 4, observed: 'predicted' },
    ];
    const now = new Date('2026-09-08T03:10:00Z');

    expect(parseKpForecast(payload, now)).toEqual({ expected: 4, maxExpected: 4, blocks: 1 });
  });

  it('ignores rows whose time tag cannot be read', () => {
    const payload = [
      { time_tag: 'not-a-timestamp', kp: 9, observed: 'predicted' },
      { time_tag: '2026-09-08T03:00:00', kp: 4, observed: 'predicted' },
    ];
    const now = new Date('2026-09-08T01:00:00Z');

    expect(parseKpForecast(payload, now)?.maxExpected).toBe(4);
  });
});
