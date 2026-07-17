import {
  parseRtswSolarWind,
  pickLatestWind,
} from '@/lib/services/swpc-solar-wind';

describe('pickLatestWind', () => {
  it('prefers the newest active sample with speed', () => {
    const rows = [
      { time_tag: 't1', active: true, proton_speed: 350 },
      { time_tag: 't2', active: false, proton_speed: 400 },
      { time_tag: 't3', active: true, proton_speed: 410 },
    ];
    expect(pickLatestWind(rows)?.time_tag).toBe('t3');
  });

  it('falls back to any positive speed when none are active', () => {
    const rows = [
      { time_tag: 't1', active: false, proton_speed: 350 },
      { time_tag: 't2', active: false, proton_speed: 0 },
    ];
    expect(pickLatestWind(rows)?.time_tag).toBe('t1');
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
});
