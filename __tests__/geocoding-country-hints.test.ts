import { parseLocationInput } from '@/lib/weather/weather-geocoding';
import { locationInputToSlug, slugToSearchTerm } from '@/lib/city-slug';
import { searchGeocodingDirect } from '@/lib/geocoding/lookup';
import { fetchWithTimeout } from '@/lib/fetch-with-timeout';

jest.mock('@/lib/fetch-with-timeout');
const fetchMock = jest.mocked(fetchWithTimeout);
const results = [
  { name: 'London', latitude: 42.98, longitude: -81.25, country_code: 'CA', country: 'Canada', admin1: 'Ontario' },
  { name: 'London', latitude: 51.5, longitude: -0.12, country_code: 'GB', country: 'United Kingdom', admin1: 'England' },
];
beforeEach(() => fetchMock.mockResolvedValue({ ok: true, json: async () => ({ results }) } as Response));

describe('Geographic search hints', () => {
  it.each(['UK', 'GB', 'United Kingdom'])('resolves London with country hint %s to the same coordinates', async (country) => {
    expect(await searchGeocodingDirect(`London, ${country}`, 1)).toEqual([
      expect.objectContaining({ lat: 51.5, lon: -0.12, country: 'GB' }),
    ]);
  });
  it('does not silently choose a different country when an explicit hint has no match', async () => {
    expect(await searchGeocodingDirect('London, Australia', 1)).toEqual([]);
  });

  it.each([
    ['Toronto, Canada', 'CA', 'Ontario'],
    ['Berlin, Germany', 'DE', 'Berlin'],
    ['Mumbai, India', 'IN', 'Maharashtra'],
  ])('preserves the country in the complete route-to-geocoding path for %s', async (input, country, region) => {
    const name = input.split(',')[0];
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ results: [
      { name, latitude: 1, longitude: 2, country_code: 'US', admin1: 'California' },
      { name, latitude: 3, longitude: 4, country_code: country, admin1: region },
    ] }) } as Response);
    const query = slugToSearchTerm(locationInputToSlug(input));
    expect(await searchGeocodingDirect(query, 1)).toEqual([expect.objectContaining({ country, lat: 3, lon: 4 })]);
  });

  it('retains explicit country and state boundaries instead of silently overriding them', async () => {
    const query = parseLocationInput(slugToSearchTerm(locationInputToSlug('Paris, TX, France')));
    expect(query).toMatchObject({ city: 'Paris', state: 'TX', country: 'FR' });
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ results: [
      { name: 'Paris', latitude: 33.66, longitude: -95.55, country_code: 'US', admin1: 'Texas' },
    ] }) } as Response);
    expect(await searchGeocodingDirect(`${query.city},${query.state},${query.country}`, 1)).toEqual([]);
    expect(slugToSearchTerm('new-york-ny-us')).toBe('New York, NY, US');
  });
});
