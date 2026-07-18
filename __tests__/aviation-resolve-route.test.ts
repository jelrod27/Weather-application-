import {
  standingDataRouteUrl,
  fromStandingPayload,
} from '@/lib/aviation/resolve-route';

describe('standingDataRouteUrl', () => {
  it('builds airline-folder path from callsign', () => {
    expect(standingDataRouteUrl('SWA2200')).toBe(
      'https://vrs-standing-data.adsb.lol/routes/SW/SWA2200.json',
    );
    expect(standingDataRouteUrl('ual2096')).toBe(
      'https://vrs-standing-data.adsb.lol/routes/UA/UAL2096.json',
    );
  });
});

describe('fromStandingPayload', () => {
  it('parses SJC-OGG for SWA2200 standing-data', () => {
    const route = fromStandingPayload('SWA2200', {
      callsign: 'SWA2200',
      airport_codes: 'KSJC-PHOG',
      _airport_codes_iata: 'SJC-OGG',
      _airports: [
        {
          name: 'Norman Y. Mineta San Jose International Airport',
          icao: 'KSJC',
          iata: 'SJC',
          lat: 37.36,
          lon: -121.93,
        },
        {
          name: 'Kahului Airport',
          icao: 'PHOG',
          iata: 'OGG',
          lat: 20.9,
          lon: -156.43,
        },
      ],
    });

    expect(route).not.toBeNull();
    expect(route!.source).toBe('standing-data');
    expect(route!.origin).toBe('SJC');
    expect(route!.destination).toBe('OGG');
    expect(route!.originAirport?.icao).toBe('KSJC');
    expect(route!.destinationAirport?.icao).toBe('PHOG');
  });

  it('returns null for unknown routes', () => {
    expect(
      fromStandingPayload('ZZZ999', { airport_codes: 'unknown', _airports: [] }),
    ).toBeNull();
  });
});
