import { fetchWeatherData } from '@/lib/weather/weather-current';
import { geocodeLocation, reverseGeocodeLocation } from '@/lib/weather/weather-geocoding';
import { buildWeatherDataFromOpenMeteo } from '@/lib/weather/open-meteo-adapter';

jest.mock('@/lib/weather/weather-geocoding', () => ({
  parseLocationInput: (query: string) => ({ query }), geocodeLocation: jest.fn(), reverseGeocodeLocation: jest.fn(),
}));
jest.mock('@/lib/weather/open-meteo-adapter', () => ({ buildWeatherDataFromOpenMeteo: jest.fn() }));
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(geocodeLocation).mockResolvedValue({ lat: 51.5, lon: -0.12, displayName: 'London', country: 'GB' });
  jest.mocked(reverseGeocodeLocation).mockResolvedValue({ displayName: 'London', country: 'GB' });
});
describe('Weather query routing', () => {
  it('geocodes city queries before loading forecast data', async () => {
    await fetchWeatherData('London, UK', 'metric');
    expect(geocodeLocation).toHaveBeenCalledWith({ query: 'London, UK' });
    expect(buildWeatherDataFromOpenMeteo).toHaveBeenCalledWith(51.5, -0.12, 'London', 'metric', 'GB');
  });
  it.each(['51.5,-0.12', '0,0'])('uses coordinate query %s without a city lookup', async (query) => {
    await fetchWeatherData(query, 'metric');
    expect(geocodeLocation).not.toHaveBeenCalled();
    expect(reverseGeocodeLocation).toHaveBeenCalledWith(...query.split(',').map(Number));
  });
  it('rejects out-of-range coordinate links before making a request', async () => {
    const log = jest.spyOn(console, 'error').mockImplementation(() => {});
    await expect(fetchWeatherData('91,0')).rejects.toThrow('Invalid coordinates');
    expect(geocodeLocation).not.toHaveBeenCalled();
    expect(reverseGeocodeLocation).not.toHaveBeenCalled();
    log.mockRestore();
  });
});
