import {
  parseRtswSolarWind,
  pickLatestWind,
} from '@/lib/services/swpc-solar-wind';

describe('pickLatestWind', () => {
  // Real tags, because the selection is by time and the previous placeholder
  // tags let a wrong assumption about array order pass unnoticed.
  const OLDEST = '2026-09-07T01:12:00';
  const MIDDLE = '2026-09-07T13:00:00';
  const NEWEST = '2026-09-08T01:08:00';

  it('prefers the newest active sample with speed', () => {
    const rows = [
      { time_tag: OLDEST, active: true, proton_speed: 350 },
      { time_tag: MIDDLE, active: false, proton_speed: 400 },
      { time_tag: NEWEST, active: true, proton_speed: 410 },
    ];
    expect(pickLatestWind(rows)?.time_tag).toBe(NEWEST);
  });

  /**
   * SWPC serves RTSW newest-first. Scanning from the end of the array used to
   * return the oldest sample in the 24-hour window, so the site reported
   * yesterday's solar wind as current.
   */
  it('reads the newest sample when the feed is newest-first', () => {
    const rows = [
      { time_tag: NEWEST, active: true, proton_speed: 551 },
      { time_tag: MIDDLE, active: true, proton_speed: 420 },
      { time_tag: OLDEST, active: true, proton_speed: 360 },
    ];
    expect(pickLatestWind(rows)?.proton_speed).toBe(551);
  });

  it('reads the newest sample when the feed is oldest-first', () => {
    const rows = [
      { time_tag: OLDEST, active: true, proton_speed: 360 },
      { time_tag: MIDDLE, active: true, proton_speed: 420 },
      { time_tag: NEWEST, active: true, proton_speed: 551 },
    ];
    expect(pickLatestWind(rows)?.proton_speed).toBe(551);
  });

  it('falls back to any positive speed when none are active', () => {
    const rows = [
      { time_tag: OLDEST, active: false, proton_speed: 350 },
      { time_tag: NEWEST, active: false, proton_speed: 0 },
    ];
    expect(pickLatestWind(rows)?.time_tag).toBe(OLDEST);
  });

  it('prefers an active sample over a newer inactive one', () => {
    const rows = [
      { time_tag: NEWEST, active: false, proton_speed: 999 },
      { time_tag: OLDEST, active: true, proton_speed: 360 },
    ];
    expect(pickLatestWind(rows)?.proton_speed).toBe(360);
  });
});

describe('parseRtswSolarWind', () => {
  it('maps RTSW wind + mag objects into current conditions', () => {
    const wind = [
      {
        time_tag: '2026-07-17T23:00:00',
        active: true,
        proton_speed: 402.1,
        proton_density: 2.52,
        proton_temperature: 149636,
      },
    ];
    const mag = [
      {
        time_tag: '2026-07-17T23:00:00',
        active: true,
        bz_gsm: -3.2,
        bt: 5.1,
      },
    ];

    const parsed = parseRtswSolarWind(wind, mag);
    expect(parsed.available).toBe(true);
    expect(parsed.current.speed).toBe(402);
    expect(parsed.current.density).toBe(2.5);
    expect(parsed.current.bz).toBe(-3.2);
    expect(parsed.current.bt).toBe(5.1);
  });

  it('marks unavailable when wind feed is empty', () => {
    expect(parseRtswSolarWind([], []).available).toBe(false);
  });

  it('keeps magnetic fields null when mag feed is empty', () => {
    const wind = [
      {
        time_tag: '2026-07-17T23:00:00',
        active: true,
        proton_speed: 400,
        proton_density: 3,
        proton_temperature: 100000,
      },
    ];
    const parsed = parseRtswSolarWind(wind, []);
    expect(parsed.available).toBe(true);
    expect(parsed.current.bz).toBeNull();
    expect(parsed.current.bt).toBeNull();
  });

  // RTSW is a one-minute cadence. The previous fixture counted 60 *hours*,
  // so 36 of its rows carried times like T59:00:00 that do not parse.
  const minuteRows = (count: number, order: 'asc' | 'desc' = 'asc', step = 1) => {
    const rows = Array.from({ length: count }, (_, i) => ({
      time_tag: `2026-07-17T04:${String(i).padStart(2, '0')}:00`,
      active: true,
      proton_speed: 300 + i * step,
      proton_density: 2,
      proton_temperature: 100000,
    }));
    return order === 'asc' ? rows : rows.reverse();
  };

  it('includes the newest sample in the recent series', () => {
    const parsed = parseRtswSolarWind(minuteRows(60), []);
    const lastRecent = parsed.recent[parsed.recent.length - 1];
    expect(lastRecent?.speed).toBe(359);
  });

  it('reads the same series whichever way SWPC orders the feed', () => {
    const ascending = parseRtswSolarWind(minuteRows(60, 'asc'), []);
    const descending = parseRtswSolarWind(minuteRows(60, 'desc'), []);

    expect(descending.current.speed).toBe(ascending.current.speed);
    expect(descending.recent.map((p) => p.speed)).toEqual(
      ascending.recent.map((p) => p.speed),
    );
    expect(descending.trend).toBe(ascending.trend);
  });

  it('reads a climbing stream as rising whichever way the feed is ordered', () => {
    // A steep ramp, because determineSpeedTrend needs more than a 10% change
    // between the two halves of the window before it calls a direction.
    const ascending = parseRtswSolarWind(minuteRows(60, 'asc', 5), []);
    const descending = parseRtswSolarWind(minuteRows(60, 'desc', 5), []);

    // Before the fix a newest-first feed reported the opposite direction.
    expect(ascending.trend).toBe('increasing');
    expect(descending.trend).toBe('increasing');
  });
});
