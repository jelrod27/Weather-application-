import { isActiveFlight } from '@/lib/aviation/active-aircraft';
import { normalizeAircraft, normalizeAircraftList } from '@/lib/aviation/normalize-aircraft';
import {
  clampRadiusNm,
  clearAircraftNearCache,
  getAircraftNear,
  nearCacheKey,
  type AircraftProvider,
} from '@/lib/aviation/aircraft-providers';
import type { Aircraft } from '@/lib/aviation/aircraft-types';

const SAMPLE_RAW = {
  hex: 'a12a7b',
  flight: 'UAL2096 ',
  r: 'N17401',
  t: 'B39M',
  alt_baro: 14275,
  alt_geom: 15075,
  gs: 341.4,
  track: 143.1,
  baro_rate: -2496,
  squawk: '3276',
  lat: 34.253677,
  lon: -118.892193,
  seen: 0.2,
};

describe('normalizeAircraft', () => {
  it('maps adsb.lol fields into Aircraft', () => {
    const a = normalizeAircraft(SAMPLE_RAW, 'adsb.lol');
    expect(a).toEqual({
      icao24: 'a12a7b',
      callsign: 'UAL2096',
      registration: 'N17401',
      typeCode: 'B39M',
      lat: 34.253677,
      lon: -118.892193,
      altitudeFt: 14275,
      onGround: false,
      groundSpeedKt: 341.4,
      trackDeg: 143.1,
      verticalRateFpm: -2496,
      squawk: '3276',
      seenSec: 0.2,
      source: 'adsb.lol',
    });
  });

  it('marks alt_baro "ground" as onGround with altitude 0', () => {
    const a = normalizeAircraft(
      { ...SAMPLE_RAW, alt_baro: 'ground', gs: 0 },
      'adsb.lol',
    );
    expect(a?.onGround).toBe(true);
    expect(a?.altitudeFt).toBe(0);
    expect(isActiveFlight(a!)).toBe(false);
  });

  it('keeps takeoff-roll ground traffic as active', () => {
    const a = normalizeAircraft(
      { ...SAMPLE_RAW, alt_baro: 'ground', gs: 85 },
      'adsb.lol',
    );
    expect(a?.onGround).toBe(true);
    expect(isActiveFlight(a!)).toBe(true);
  });

  it('drops aircraft without hex or coordinates', () => {
    expect(normalizeAircraft({ flight: 'X' }, 'adsb.lol')).toBeNull();
    expect(normalizeAircraft({ hex: 'abc', lat: 1 }, 'adsb.lol')).toBeNull();
  });

  it('normalizes a list and skips junk', () => {
    const list = normalizeAircraftList([SAMPLE_RAW, null, { hex: 'x' }], 'adsb.fi');
    expect(list).toHaveLength(1);
    expect(list[0]!.source).toBe('adsb.fi');
  });
});

describe('aircraft near cache + failover', () => {
  beforeEach(() => {
    clearAircraftNearCache();
  });

  it('clamps radius to 1..250', () => {
    expect(clampRadiusNm(0)).toBe(100);
    expect(clampRadiusNm(999)).toBe(250);
    expect(clampRadiusNm(42.6)).toBe(43);
  });

  it('rounds cache keys', () => {
    expect(nearCacheKey(34.253677, -118.892193, 50)).toBe('34.25:-118.89:50');
  });

  it('fails over to the next provider and marks degraded', async () => {
    const aircraft: Aircraft[] = [
      {
        icao24: 'abc',
        callsign: 'TEST1',
        registration: null,
        typeCode: null,
        lat: 1,
        lon: 2,
        altitudeFt: 1000,
        onGround: false,
        groundSpeedKt: 100,
        trackDeg: 90,
        verticalRateFpm: 0,
        squawk: null,
        seenSec: 0,
        source: 'airplanes.live',
      },
    ];

    const providers: AircraftProvider[] = [
      {
        name: 'adsb.lol',
        getAircraftNear: async () => {
          throw new Error('primary down');
        },
      },
      {
        name: 'airplanes.live',
        getAircraftNear: async () => aircraft,
      },
    ];

    const result = await getAircraftNear(34, -118, 50, {
      providers,
      skipCache: true,
    });
    expect(result.source).toBe('airplanes.live');
    expect(result.degraded).toBe(true);
    expect(result.count).toBe(1);
  });

  it('filters parked ground aircraft from near feed', async () => {
    const providers: AircraftProvider[] = [
      {
        name: 'adsb.lol',
        getAircraftNear: async () => [
          {
            icao24: 'park',
            callsign: 'N123AB',
            registration: null,
            typeCode: null,
            lat: 1,
            lon: 2,
            altitudeFt: 0,
            onGround: true,
            groundSpeedKt: 0,
            trackDeg: 0,
            verticalRateFpm: 0,
            squawk: null,
            seenSec: 0,
            source: 'adsb.lol',
          },
          {
            icao24: 'fly1',
            callsign: 'UAL1',
            registration: null,
            typeCode: null,
            lat: 1.1,
            lon: 2.1,
            altitudeFt: 12000,
            onGround: false,
            groundSpeedKt: 400,
            trackDeg: 90,
            verticalRateFpm: 0,
            squawk: null,
            seenSec: 0,
            source: 'adsb.lol',
          },
        ],
      },
    ];

    const result = await getAircraftNear(34, -118, 50, {
      providers,
      skipCache: true,
    });
    expect(result.count).toBe(1);
    expect(result.aircraft[0]?.icao24).toBe('fly1');
  });

  it('serves cache within TTL', async () => {
    let calls = 0;
    const providers: AircraftProvider[] = [
      {
        name: 'adsb.lol',
        getAircraftNear: async () => {
          calls += 1;
          return [];
        },
      },
    ];

    const now = 1_000_000;
    await getAircraftNear(34, -118, 50, { providers, now });
    await getAircraftNear(34, -118, 50, { providers, now: now + 1_000 });
    expect(calls).toBe(1);
  });
});
