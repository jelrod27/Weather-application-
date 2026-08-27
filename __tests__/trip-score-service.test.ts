/**
 * Pins trip-score composition: drive 422 (no corridor), fly hub 422,
 * and success-shape keys when weather/METAR/alerts are mocked.
 */

jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((body: unknown, init?: { status?: number; headers?: Record<string, string> }) => ({
      status: init?.status || 200,
      headers: init?.headers || {},
      json: async () => body,
    })),
  },
}));

jest.mock('@/lib/geocoding/lookup', () => ({
  resolveGeocodingQuery: jest.fn(),
}));

jest.mock('@/lib/services/trip-routing-service', () => {
  const actual = jest.requireActual('@/lib/services/trip-routing-service') as typeof import('@/lib/services/trip-routing-service');
  return {
    ...actual,
    matchCorridor: jest.fn(),
  };
});

jest.mock('@/lib/services/travel-corridor-service', () => {
  const actual = jest.requireActual('@/lib/services/travel-corridor-service') as typeof import('@/lib/services/travel-corridor-service');
  return {
    ...actual,
    fetchWeatherForWaypoints: jest.fn(),
  };
});

jest.mock('@/lib/services/aviation-noaa-service', () => ({
  fetchMetarsBulk: jest.fn(),
  fetchAviationAlertsFromNOAA: jest.fn(),
}));

jest.mock('@/lib/error-utils', () => ({
  logRouteError: jest.fn(),
}));

import {
  resolveEndpoint,
  computeDriveTripScore,
  computeFlyTripScore,
  type ResolvedEndpoint,
} from '@/lib/services/trip-score-service';
import { resolveGeocodingQuery } from '@/lib/geocoding/lookup';
import { matchCorridor } from '@/lib/services/trip-routing-service';
import { fetchWeatherForWaypoints } from '@/lib/services/travel-corridor-service';
import {
  fetchMetarsBulk,
  fetchAviationAlertsFromNOAA,
} from '@/lib/services/aviation-noaa-service';
import { findAirportByCode } from '@/lib/data/major-us-airports';
import type { MetarObservation } from '@/lib/aviation/metar';

const mockResolveGeocoding = resolveGeocodingQuery as jest.MockedFunction<
  typeof resolveGeocodingQuery
>;
const mockMatchCorridor = matchCorridor as jest.MockedFunction<typeof matchCorridor>;
const mockFetchWeather = fetchWeatherForWaypoints as jest.MockedFunction<
  typeof fetchWeatherForWaypoints
>;
const mockFetchMetars = fetchMetarsBulk as jest.MockedFunction<typeof fetchMetarsBulk>;
const mockFetchAlerts = fetchAviationAlertsFromNOAA as jest.MockedFunction<
  typeof fetchAviationAlertsFromNOAA
>;

const hawaii: ResolvedEndpoint = {
  query: 'Honolulu, HI',
  coords: { lat: 21.3069, lon: -157.8583 },
  label: 'Honolulu, HI',
};

const anchorage: ResolvedEndpoint = {
  query: 'Anchorage, AK',
  coords: { lat: 61.2181, lon: -149.9003 },
  label: 'Anchorage, AK',
};

function airportEndpoint(code: string): ResolvedEndpoint {
  const airport = findAirportByCode(code);
  if (!airport) throw new Error(`fixture airport missing: ${code}`);
  return {
    query: code,
    coords: { lat: airport.lat, lon: airport.lon },
    label: `${airport.iata} — ${airport.city}, ${airport.state}`,
    airport,
  };
}

function sampleMetar(icao: string): MetarObservation {
  return {
    raw: `${icao} 011200Z 18008KT 10SM SCT050 21/12 A2992`,
    icao,
    observationTime: '2026-08-27T12:00:00Z',
    windSpeed: 8,
    visibility: 10,
    flightCategory: 'VFR',
    clouds: [{ cover: 'SCT', base: 5000 }],
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('resolveEndpoint', () => {
  it('resolves an IATA code without geocoding', async () => {
    const result = await resolveEndpoint('DEN', true);
    expect(result?.airport?.iata).toBe('DEN');
    expect(mockResolveGeocoding).not.toHaveBeenCalled();
  });

  it('falls back to geocoding when no airport matches', async () => {
    mockResolveGeocoding.mockResolvedValueOnce([
      { name: 'Boise', state: 'Idaho', country: 'United States', lat: 43.615, lon: -116.202 },
    ]);

    const result = await resolveEndpoint('Boise, ID', false);
    expect(result).toMatchObject({
      coords: { lat: 43.615, lon: -116.202 },
      label: 'Boise, Idaho, United States',
    });
    expect(result?.airport).toBeUndefined();
    expect(mockResolveGeocoding).toHaveBeenCalledWith('Boise, ID', 1);
  });
});

describe('computeDriveTripScore', () => {
  it('returns 422 when no interstate corridor connects the points', async () => {
    mockMatchCorridor.mockReturnValueOnce(null);

    const res = await computeDriveTripScore(hawaii, anchorage, 0, new AbortController().signal);
    expect(res.status).toBe(422);
    await expect(res.json()).resolves.toEqual({
      error: 'No interstate corridor connects these points',
    });
    expect(mockFetchWeather).not.toHaveBeenCalled();
  });

  it('returns drive success shape keys when weather is mocked', async () => {
    mockMatchCorridor.mockReturnValueOnce({
      name: 'I-70',
      matchedSegment: {
        startIdx: 0,
        endIdx: 1,
        waypoints: [
          [39.74, -104.99],
          [39.1, -94.58],
        ],
      },
      totalCorridorLength: 2,
    });
    mockFetchWeather.mockResolvedValueOnce([
      { precipitation: 0, snowfall: 0, windGusts: 10, visibility: 10000, freezingLevel: 3000 },
      { precipitation: 1, snowfall: 0, windGusts: 20, visibility: 8000, freezingLevel: 2500 },
    ]);

    const origin = airportEndpoint('DEN');
    const destination = airportEndpoint('ORD');
    const res = await computeDriveTripScore(origin, destination, 0, new AbortController().signal);

    expect(res.status).toBe(200);
    expect(res.headers['Cache-Control']).toBe(
      'public, s-maxage=600, stale-while-revalidate=300',
    );
    const body = await res.json();
    expect(body).toMatchObject({
      mode: 'drive',
    });
    expect(body.score).toEqual(expect.objectContaining({ score: expect.any(Number) }));
    expect(body.route).toEqual(
      expect.objectContaining({
        corridorName: 'I-70',
        segments: expect.any(Array),
      }),
    );
    expect(body.worstSegment).toEqual(
      expect.objectContaining({
        lat: expect.any(Number),
        lon: expect.any(Number),
        hazard: expect.any(String),
      }),
    );
    expect(typeof body.fetchedAt).toBe('string');
  });
});

describe('computeFlyTripScore', () => {
  it('returns 422 when either endpoint is not a major hub', async () => {
    const res = await computeFlyTripScore(hawaii, airportEndpoint('DEN'));
    expect(res.status).toBe(422);
    await expect(res.json()).resolves.toEqual({
      error:
        'Fly mode requires major hub airports for both origin and destination (IATA/ICAO code or hub city).',
    });
    expect(mockFetchMetars).not.toHaveBeenCalled();
    expect(mockFetchAlerts).not.toHaveBeenCalled();
  });

  it('returns fly success shape keys when METAR and alerts are mocked', async () => {
    const origin = airportEndpoint('DEN');
    const destination = airportEndpoint('JFK');
    const metars = new Map<string, MetarObservation>([
      ['KDEN', sampleMetar('KDEN')],
      ['KJFK', sampleMetar('KJFK')],
    ]);
    mockFetchMetars.mockResolvedValueOnce(metars);
    mockFetchAlerts.mockResolvedValueOnce([]);

    const res = await computeFlyTripScore(origin, destination);
    expect(res.status).toBe(200);
    expect(res.headers['Cache-Control']).toBe(
      'public, s-maxage=600, stale-while-revalidate=300',
    );
    const body = await res.json();
    expect(body.mode).toBe('fly');
    expect(body.score).toEqual(expect.objectContaining({ score: expect.any(Number) }));
    expect(body.route.origin.airport.iata).toBe('DEN');
    expect(body.route.destination.airport.iata).toBe('JFK');
    expect(body.route.enroute).toEqual(
      expect.objectContaining({
        midpoint: expect.objectContaining({
          lat: expect.any(Number),
          lon: expect.any(Number),
        }),
        hazards: expect.objectContaining({
          thunderstormsNearby: expect.any(Boolean),
          turbulenceNearby: expect.any(Boolean),
          icingNearby: expect.any(Boolean),
        }),
      }),
    );
    expect(typeof body.fetchedAt).toBe('string');
  });
});
