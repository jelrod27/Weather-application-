/**
 * Unit tests for weather geocoding functions
 */

import { parseLocationInput, type LocationQuery, geocodeLocation, reverseGeocodeLocation } from '@/lib/weather/weather-geocoding';

const originalFetch = global.fetch;

const mockFetch = (response: unknown, ok: boolean = true) => {
  global.fetch = jest.fn().mockResolvedValue({
    ok,
    json: async () => response
  }) as unknown as typeof fetch;
};

afterEach(() => {
  global.fetch = originalFetch;
  jest.clearAllMocks();
});

describe('Location Parsing', () => {
  describe('parseLocationInput', () => {
    it('should parse city name only', () => {
      const result = parseLocationInput('New York');
      expect(result.type).toBe('city_only');
      expect(result.city).toBe('New York');
    });

    it('should parse city with state', () => {
      const result = parseLocationInput('Los Angeles, CA');
      expect(result.type).toBe('city_state');
      expect(result.city).toBe('Los Angeles');
      expect(result.state).toBe('CA');
    });

    it('should parse city with country', () => {
      const result = parseLocationInput('London, UK');
      expect(result.type).toBe('city_country');
      expect(result.city).toBe('London');
      expect(result.country).toBe('UK');
    });

    it('should parse US zip code', () => {
      const result = parseLocationInput('10001');
      expect(result.type).toBe('zip');
      expect(result.zipCode).toBe('10001');
    });

    it('should handle whitespace in input', () => {
      const result = parseLocationInput('  San Francisco  ');
      expect(result.city).toBe('San Francisco');
    });

    // Regression: letters-only single-word cities must NOT be classified as
    // postal codes (previously /^[A-Z0-9]{3,10}$/i matched "London" -> zip ->
    // "ZIP code not found" for every single-word city search).
    it('should parse single-word city names as city_only, not zip', () => {
      for (const city of ['London', 'Paris', 'Denver', 'Tokyo', 'austin', 'CHICAGO']) {
        const result = parseLocationInput(city);
        expect(result.type).toBe('city_only');
        expect(result.city).toBe(city);
      }
    });

    it('should still parse digit-bearing postal codes as zip', () => {
      // US 5-digit
      expect(parseLocationInput('10001').type).toBe('zip');
      // US ZIP+4
      expect(parseLocationInput('10001-1234').type).toBe('zip');
      // UK postcode
      const uk = parseLocationInput('SW1A 1AA');
      expect(uk.type).toBe('zip');
      expect(uk.country).toBe('GB');
      // Canada postal code
      const ca = parseLocationInput('M5V 3A8');
      expect(ca.type).toBe('zip');
      expect(ca.country).toBe('CA');
      // General international (numeric, e.g. Australia/Denmark 4-digit)
      const au = parseLocationInput('2000');
      expect(au.type).toBe('zip');
      // General international alphanumeric with digits (e.g. Eircode)
      const ie = parseLocationInput('D02X285');
      expect(ie.type).toBe('zip');
    });

    it('should return query string', () => {
      const result = parseLocationInput('Austin, TX');
      expect(result.query).toBe('Austin, TX');
    });
  });
});

describe('Location Query Types', () => {
  it('should have correct structure for city_only query', () => {
    const query: LocationQuery = {
      query: 'Paris',
      type: 'city_only',
      city: 'Paris',
    };
    expect(query.type).toBe('city_only');
    expect(query.city).toBe('Paris');
  });

  it('should have correct structure for city_country query', () => {
    const query: LocationQuery = {
      query: 'Paris, FR',
      type: 'city_country',
      city: 'Paris',
      country: 'FR',
    };
    expect(query.type).toBe('city_country');
    expect(query.country).toBe('FR');
  });

  it('should have correct structure for zip query', () => {
    const query: LocationQuery = {
      query: '90210',
      type: 'zip',
      zipCode: '90210',
    };
    expect(query.type).toBe('zip');
    expect(query.zipCode).toBe('90210');
  });
});

describe('Geocoding', () => {
  describe('geocodeLocation', () => {
    it('should return country from zip geocoding response', async () => {
      mockFetch({ lat: 40.75, lon: -73.99, name: 'New York', country: 'US' });
      const result = await geocodeLocation({ query: '10001', type: 'zip', zipCode: '10001', country: 'US' });
      expect(result.country).toBe('US');
    });

    it('should return country from city geocoding response', async () => {
      mockFetch([{ lat: 51.5, lon: -0.12, name: 'London', country: 'GB' }]);
      const result = await geocodeLocation({ query: 'London', type: 'city_only', city: 'London' });
      expect(result.country).toBe('GB');
    });
  });

  describe('reverseGeocodeLocation', () => {
    it('should return country from reverse geocoding response', async () => {
      mockFetch([{ lat: 51.5, lon: -0.12, name: 'London', country: 'GB' }]);
      const result = await reverseGeocodeLocation(51.5, -0.12);
      expect(result.country).toBe('GB');
    });
  });
});
