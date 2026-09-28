import { render, screen, within } from '@testing-library/react';
import { WeatherDisplay } from '@/components/weather-display';
import type { WeatherData } from '@/lib/types';

jest.mock('@/components/hero-weather-card', () => ({ HeroWeatherCard: () => null }));
jest.mock('@/components/lazy-weather-components', () => ({ LazyForecast: () => null, LazyForecastDetails: () => null }));
jest.mock('@/components/lazy-hourly-forecast', () => () => null);
jest.mock('@/components/lazy-weather-map', () => () => null);
jest.mock('@/components/air-quality-display', () => ({ AirQualityDisplay: () => null }));
jest.mock('@/components/pollen-display', () => ({ PollenDisplay: () => null }));
jest.mock('@/components/metric-info-tooltip', () => ({ MetricInfoTooltip: () => null }));

const weather: WeatherData = {
  location: 'Test', country: 'US', currentDate: '2026-09-25', temperature: 65, unit: '°F', condition: 'Clouds', description: 'Cloudy',
  humidity: 50, wind: { speed: 5 }, pressure: '1013', sunrise: '06:00', sunset: '18:00', uvIndex: 0, aqi: 10,
  moonPhase: { phase: 'New Moon', illumination: 0, emoji: '', phaseAngle: 0, nextFullMoon: '', nextMoonset: '' },
  pollen: { tree: {}, grass: {}, weed: {} },
  forecast: [{ day: 'Friday', date: '2026-09-25', highTemp: 70, lowTemp: 50, condition: 'Clouds', description: 'Cloudy' }],
};

it.each([
  [undefined, 'Unavailable', 'N/A'],
  [NaN, 'Unavailable', 'N/A'],
  [0, 'Poor', '0'],
  [3, 'Low', '3'],
  [7, 'Moderate', '7'],
  [10, 'Clear', '10'],
])('classifies only measured visibility: %s', (visibility, label, value) => {
  render(<WeatherDisplay weather={{ ...weather, forecast: [{ ...weather.forecast[0], details: { visibility } }] }} theme="dark" selectedDay={null} onDayClick={() => {}} showRadar={false} />);
  const card = screen.getByText('Visibility').closest('.weather-metric-card') as HTMLElement;
  expect(within(card).getByText(label)).toBeInTheDocument();
  expect(within(card).getByText(value)).toBeInTheDocument();
  if (label === 'Unavailable') expect(within(card).queryByText('Clear')).not.toBeInTheDocument();
});

it.each([
  [undefined, undefined, null],
  ['Observing night of Sep 26', undefined, 'Observing night of Sep 26'],
  [undefined, 'America/New_York', 'America/New_York'],
  ['Observing night of Sep 26', 'America/New_York', 'Observing night of Sep 26 · America/New_York'],
])('renders only available Moon context: %s, %s', (observingNight, timeZone, expected) => {
  const moonPhase = { ...weather.moonPhase!, observingNight, timeZone };
  render(<WeatherDisplay weather={{ ...weather, moonPhase }} theme="dark" selectedDay={null} onDayClick={() => {}} showRadar={false} />);
  const card = screen.getByText('Moon Phase').closest('.bg-card') as HTMLElement;
  expect(within(card).getByText('New Moon')).toBeInTheDocument();
  expect(within(card).queryByText(/^·$|^· | ·$/)).not.toBeInTheDocument();
  if (expected) expect(within(card).getByText(expected)).toBeInTheDocument();
});

it('retains the unavailable message when there is no Moon information', () => {
  render(<WeatherDisplay weather={{ ...weather, moonPhase: null }} theme="dark" selectedDay={null} onDayClick={() => {}} showRadar={false} />);
  expect(screen.getByText('Moon information unavailable')).toBeInTheDocument();
});

describe('Clear Sky full-data layout', () => {
  it('keeps all nine conditions and adds coordinate-preserving discovery links', () => {
    render(<WeatherDisplay weather={{ ...weather, coordinates: { lat: 51.5, lon: -0.12 }, timezone: 'Europe/London' }} theme="clear-sky" selectedDay={null} onDayClick={() => {}} showRadar={false} />);
    for (const label of ['UV Index', 'Feels Like', 'Sun Times', 'Humidity', 'Pressure', 'Wind', 'Precipitation', 'Visibility', 'Pollen']) {
      expect(screen.getByRole('region', { name: 'Current conditions' })).toContainElement(screen.getByText(label));
    }
    expect(screen.getByRole('link', { name: /Explore local radar/ })).toHaveAttribute('href', expect.stringContaining('lat=51.5&lon=-0.12'));
    expect(screen.getByRole('link', { name: /Learn to read the sky/ })).toHaveAttribute('href', expect.stringContaining('returnTo='));
  });
  it('does not label missing weather readings as low UV, comfortable humidity or calm wind', () => {
    render(<WeatherDisplay weather={{ ...weather, uvIndex: NaN, humidity: NaN, pressure: '', wind: { speed: NaN } }} theme="clear-sky" selectedDay={null} onDayClick={() => {}} showRadar={false} />);
    for (const label of ['UV Index', 'Humidity', 'Pressure', 'Wind', 'Feels Like']) {
      const card = screen.getByText(label).closest('.weather-metric-card') as HTMLElement;
      expect(within(card).getByText('Unavailable')).toBeInTheDocument();
      expect(within(card).queryByText(/^(Low|Comfortable|Calm|Same as actual)$/)).not.toBeInTheDocument();
      expect(card).not.toHaveTextContent('NaN');
    }
  });
});

it('preserves measured zeros without inventing precipitation for an invalid snapshot', () => {
  const { rerender } = render(<WeatherDisplay weather={{ ...weather, humidity: 0, wind: { speed: 0, gust: 0 } }} theme="clear-sky" selectedDay={null} onDayClick={() => {}} precipitation={{ rain24h: 0, snow24h: 0 }} showRadar={false} />);
  expect(screen.getByText('0.00"')).toBeInTheDocument();
  expect(screen.getByText('0%')).toBeInTheDocument();
  expect(screen.getByText('Gusts 0 mph')).toBeInTheDocument();
  rerender(<WeatherDisplay weather={weather} theme="clear-sky" selectedDay={null} onDayClick={() => {}} precipitation={{ rain24h: NaN, snow24h: 0 }} showRadar={false} />);
  const card = screen.getByText('Precipitation').closest('.weather-metric-card') as HTMLElement;
  expect(within(card).getByText('N/A')).toBeInTheDocument();
  expect(card).not.toHaveTextContent('NaN');
});

it.each([NaN, Infinity])('does not fabricate Moon illumination for %s', illumination => {
  render(<WeatherDisplay weather={{ ...weather, moonPhase: { ...weather.moonPhase!, phase: '', illumination } }} theme="clear-sky" selectedDay={null} onDayClick={() => {}} showRadar={false} />);
  const card = screen.getByText('Moon Phase').closest('.bg-card') as HTMLElement;
  expect(within(card).getByText('Illumination unavailable')).toBeInTheDocument();
  expect(within(card).queryByText('0% illuminated')).not.toBeInTheDocument();
  expect(within(card).queryByRole('progressbar')).not.toBeInTheDocument();
  expect(card.querySelector('svg defs')).toBeNull();
});

it.each(['°F', '°C'])('preserves supplied condition readings and units in %s', unit => {
  render(<WeatherDisplay weather={{
    ...weather, unit, temperature: 64, humidity: 71, pressure: unit === '°F' ? '29.36 in' : '994 hPa',
    wind: { speed: 11.9, direction: 'W', gust: 16.1 }, sunrise: '7:00 am', sunset: '6:56 pm', uvIndex: 3,
    hourlyForecast: [{ dt: 1790596800, time: '4 PM', temp: 64, feelsLike: 58, condition: 'Clouds', description: 'Cloudy', precipChance: 20 }],
    forecast: [{ ...weather.forecast[0], details: { visibility: 39.1 } }],
  }} theme="clear-sky" selectedDay={null} onDayClick={() => {}} precipitation={{ rain24h: 0.12, snow24h: 0 }} showRadar={false} />);
  const conditions = screen.getByRole('region', { name: 'Current conditions' });
  for (const reading of ['58°', '6° cooler', '71%', unit === '°F' ? '29.36 in' : '994 hPa', '7:00 am', '6:56 pm', '0.12"', '39.1']) {
    expect(within(conditions).getByText(reading)).toBeInTheDocument();
  }
  expect(within(conditions).getByRole('progressbar', { name: 'Humidity' })).toHaveAttribute('aria-valuenow', '71');
  expect(within(conditions).getByText(`Gusts 16.1 ${unit === '°F' ? 'mph' : 'km/h'}`)).toBeInTheDocument();
  expect(screen.getByText('0% illuminated')).toBeInTheDocument();
});
