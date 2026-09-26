import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import HourlyClient from '@/app/hourly/hourly-client';
import { fetchWeatherData } from '@/lib/weather';
import { weatherSessionCache } from '@/lib/weather-session-cache';

let params = new URLSearchParams();
let location = '';
let draftLocation = '';
const push = jest.fn();
jest.mock('next/navigation', () => ({ useSearchParams: () => params, useRouter: () => ({ push }) }));
jest.mock('@/components/location-context', () => ({ useLocationContext: () => ({ currentLocation: location, locationInput: draftLocation }) }));
jest.mock('@/components/theme-provider', () => ({ useTheme: () => ({ theme: 'nord' }) }));
jest.mock('@/lib/auth', () => ({ useAuth: () => ({ preferences: null }) }));
jest.mock('@/lib/weather', () => ({ fetchWeatherData: jest.fn() }));
jest.mock('@/lib/weather-session-cache', () => ({ weatherSessionCache: { getLastDisplayed: jest.fn(() => null) } }));
jest.mock('@/components/weather-search', () => ({ __esModule: true, default: ({ onSearch }: { onSearch: (q: string) => void }) => <button onClick={() => onSearch('London, UK')}>Search London</button> }));
jest.mock('@/components/hourly-forecast', () => ({ __esModule: true, default: () => <div>Hourly results</div> }));

const fetchMock = jest.mocked(fetchWeatherData);
const fixture = { location: 'London, England, GB', unit: '°C', coordinates: { lat: 51.5, lon: -0.12 }, hourlyForecast: [{ dt: 1 }] } as Awaited<ReturnType<typeof fetchWeatherData>>;
beforeEach(() => { jest.clearAllMocks(); params = new URLSearchParams(); location = ''; draftLocation = ''; fetchMock.mockResolvedValue(fixture); });

describe('Hourly location recovery', () => {
  it('offers search on a direct visit without a location', async () => {
    render(<HourlyClient />);
    expect(await screen.findByText(/Choose a location/)).toBeInTheDocument();
    fireEvent.click(screen.getByText('Search London'));
    expect(push).toHaveBeenCalledWith('/hourly?city=London%2C+UK');
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('recovers the viewed location on footer navigation', async () => {
    location = 'London, UK';
    render(<HourlyClient />);
    expect(await screen.findByText('Hourly results')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to forecast' })).toHaveAttribute('href', '/weather/london-uk?location=51.5%2C-0.12');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(location, expect.any(String));
  });
  it('recovers a cached location after a reload', async () => {
    jest.mocked(weatherSessionCache.getLastDisplayed).mockReturnValueOnce({ location: 'London, UK', weather: fixture });
    render(<HourlyClient />);
    expect(await screen.findByText('Hourly results')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('London, UK', expect.any(String));
  });
  it('prioritizes explicit coordinates, including zero, over prior context', async () => {
    location = 'New York'; params = new URLSearchParams('lat=0&lon=0');
    render(<HourlyClient />);
    await screen.findByText('Hourly results');
    expect(fetchMock).toHaveBeenCalledWith('0,0', expect.any(String));
  });
  it('recovers from failure on retry and ignores late results for the previous city', async () => {
    const error = jest.spyOn(console, 'error').mockImplementation(() => {});
    params = new URLSearchParams('city=London');
    fetchMock.mockRejectedValueOnce(new Error('offline'));
    const { rerender } = render(<HourlyClient />);
    fireEvent.click(await screen.findByText('Retry hourly forecast'));
    await screen.findByText('Hourly results');
    let resolveOld!: (value: typeof fixture) => void;
    fetchMock.mockImplementationOnce(() => new Promise((resolve) => { resolveOld = resolve; }));
    params = new URLSearchParams('city=Paris'); rerender(<HourlyClient />);
    expect(screen.getByRole('link', { name: 'Back to forecast' })).toHaveAttribute('href', '/weather/paris?location=Paris');
    params = new URLSearchParams('city=Tokyo'); rerender(<HourlyClient />);
    await waitFor(() => expect(fetchMock).toHaveBeenLastCalledWith('Tokyo', expect.any(String)));
    resolveOld({ ...fixture, location: 'Wrong old city' });
    await screen.findByText('Hourly results');
    expect(screen.queryByText('Wrong old city')).not.toBeInTheDocument();
    error.mockRestore();
  });
  it('shows coordinate recovery without silently loading a different location', async () => {
    location = 'London'; params = new URLSearchParams('lat=91&lon=0');
    render(<HourlyClient />);
    expect(await screen.findByRole('alert')).toHaveTextContent('coordinates are invalid');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('does not fetch or disable search while the user is typing a new draft', async () => {
    const { rerender } = render(<HourlyClient />);
    await screen.findByText(/Choose a location/);
    draftLocation = 'Lon';
    rerender(<HourlyClient />);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByText(/Choose a location/)).toBeInTheDocument();
  });
});
