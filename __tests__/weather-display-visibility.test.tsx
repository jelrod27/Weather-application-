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
