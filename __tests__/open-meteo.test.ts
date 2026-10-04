/**
 * Unit tests for Open-Meteo service layer
 */

import { fetchOpenMeteoForecast, fetchOpenMeteoAirQuality } from '@/lib/open-meteo';

// Mock global fetch
const originalFetch = global.fetch;
const mockFetch = jest.fn();
global.fetch = mockFetch;

afterAll(() => {
  global.fetch = originalFetch;
});

describe('fetchOpenMeteoForecast', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('should call the Open-Meteo forecast API with correct parameters', async () => {
    const mockResponse = {
      latitude: 40.71,
      longitude: -74.01,
      generationtime_ms: 0.5,
      utc_offset_seconds: -18000,
      timezone: 'America/New_York',
      timezone_abbreviation: 'EST',
      elevation: 10,
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await fetchOpenMeteoForecast(40.71, -74.01);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const calledUrl = new URL(mockFetch.mock.calls[0][0]);
    expect(calledUrl.origin + calledUrl.pathname).toBe(
      'https://api.open-meteo.com/v1/forecast'
    );
    expect(calledUrl.searchParams.get('latitude')).toBe('40.71');
    expect(calledUrl.searchParams.get('longitude')).toBe('-74.01');
    expect(calledUrl.searchParams.get('temperature_unit')).toBe('fahrenheit');
    expect(calledUrl.searchParams.get('wind_speed_unit')).toBe('mph');
    expect(calledUrl.searchParams.get('precipitation_unit')).toBe('inch');
    expect(calledUrl.searchParams.get('forecast_days')).toBe('7');
    expect(calledUrl.searchParams.get('timezone')).toBe('auto');
    expect(calledUrl.searchParams.get('hourly')?.split(',')).toContain('is_day');
    expect(result).toEqual(mockResponse);
  });

  it('should throw on non-ok response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => 'Internal Server Error',
    });

    await expect(fetchOpenMeteoForecast(40.71, -74.01)).rejects.toThrow(
      'Open-Meteo Forecast API error 500: Internal Server Error'
    );
  });
});

describe('fetchOpenMeteoAirQuality', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('should call the Open-Meteo air quality API with correct parameters', async () => {
    const mockResponse = {
      latitude: 40.71,
      longitude: -74.01,
      generationtime_ms: 0.3,
      utc_offset_seconds: -18000,
      timezone: 'America/New_York',
      timezone_abbreviation: 'EST',
      elevation: 10,
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await fetchOpenMeteoAirQuality(40.71, -74.01);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const calledUrl = new URL(mockFetch.mock.calls[0][0]);
    expect(calledUrl.origin + calledUrl.pathname).toBe(
      'https://air-quality-api.open-meteo.com/v1/air-quality'
    );
    expect(calledUrl.searchParams.get('latitude')).toBe('40.71');
    expect(calledUrl.searchParams.get('longitude')).toBe('-74.01');
    expect(calledUrl.searchParams.get('timezone')).toBe('auto');
    expect(result).toEqual(mockResponse);
  });
});
