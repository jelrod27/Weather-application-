import { render, screen } from '@testing-library/react';
import CityWeatherClient from '@/app/weather/[city]/client';
import { useCityWeatherSession } from '@/hooks/useCityWeatherSession';
import SaveLocationButton from '@/components/weather/save-location-button';
import type { ReactNode } from 'react';
import type { WeatherData } from '@/lib/types';

let params = new URLSearchParams();
jest.mock('next/navigation', () => ({ useSearchParams: () => params, useRouter: () => ({ push: jest.fn() }) }));
jest.mock('next/dynamic', () => ({ __esModule: true, default: () => () => null }));
jest.mock('@/hooks/useCityWeatherSession');
jest.mock('@/hooks/usePrecipitationHistory', () => ({ usePrecipitationHistory: () => null }));
jest.mock('@/hooks/use-hub-location', () => ({ useHubLocation: () => null }));
jest.mock('@/components/theme-provider', () => ({ useTheme: () => ({ theme: 'nord' }) }));
jest.mock('@/components/page-wrapper', () => ({ __esModule: true, default: ({ children }: { children: ReactNode }) => <>{children}</> }));
jest.mock('@/components/responsive-container', () => ({ ResponsiveContainer: ({ children }: { children: ReactNode }) => <>{children}</> }));
jest.mock('@/components/weather-search', () => ({ __esModule: true, default: () => null }));
jest.mock('@/components/weather-display', () => ({ WeatherDisplay: () => null }));
jest.mock('@/components/weather/save-location-button', () => ({ __esModule: true, default: jest.fn(() => null) }));

const session = jest.mocked(useCityWeatherSession);
const city = { name: 'Denver', state: 'CO', searchTerm: 'Denver, CO', title: '', description: '', content: { intro: '', climate: '', patterns: '' } };
const props = { city, citySlug: 'denver-co', heading: <h1>Denver Weather &amp; Climate Guide</h1>, climateGuide: <p>Denver climate averages</p> };

beforeEach(() => {
  jest.clearAllMocks();
  params = new URLSearchParams();
  session.mockReturnValue({ weather: null, loading: true, error: '', hasSearched: false, remainingSearches: 10, handleSearch: jest.fn(), handleLocationSearch: jest.fn() });
});

describe('City route identity', () => {
  it('keeps the catalog heading and climate guide for an ordinary city visit', () => {
    render(<CityWeatherClient {...props} />);
    expect(screen.getByRole('heading')).toHaveTextContent('Denver');
    expect(screen.getByText('Denver climate averages')).toBeInTheDocument();
    expect(session).toHaveBeenCalledWith('Denver, CO');
  });

  it('uses the resolved identity for a location override, including saved locations', () => {
    params.set('location', '51.5,-0.12');
    const { rerender } = render(<CityWeatherClient {...props} />);
    expect(screen.getByRole('heading')).toHaveTextContent('Weather Forecast');
    expect(screen.queryByText(/Denver/)).not.toBeInTheDocument();
    const weather = { location: 'London, England, GB', country: 'GB', coordinates: { lat: 51.5, lon: -0.12 } } as WeatherData;
    session.mockReturnValue({ ...session.mock.results[0].value, weather, loading: false });
    rerender(<CityWeatherClient {...props} />);
    expect(screen.getByRole('heading')).toHaveTextContent('London, England, GB Weather');
    expect(screen.queryByText(/Denver/)).not.toBeInTheDocument();
    expect(session).toHaveBeenLastCalledWith('51.5,-0.12');
    expect(SaveLocationButton).toHaveBeenLastCalledWith(expect.objectContaining({ weather, cityName: 'London', state: undefined }), undefined);
  });
});
