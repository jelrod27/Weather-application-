import { render, screen } from '@testing-library/react';
import Forecast from '@/components/forecast';
import ForecastDetails from '@/components/forecast-details';
import { getWindSeverity } from '@/lib/weather-severity';
import type { ForecastDay } from '@/lib/types';

const day: ForecastDay = {
  day: 'Friday', highTemp: 75, lowTemp: 57, condition: 'Clear', description: 'clear sky',
  country: 'GB', details: { windSpeed: 0 },
};

it.each([['GB', '°F'], ['US', '°C']])('uses the supplied unit for a %s forecast', (country, tempUnit) => {
  render(<Forecast forecast={[{ ...day, country }]} tempUnit={tempUnit} />);
  expect(screen.getByRole('button', { name: `Forecast for Friday: High 75${tempUnit}, Low 57${tempUnit}, clear sky` })).toBeInTheDocument();
});

it('labels expanded metric temperatures and calm wind with the actual units', () => {
  render(<ForecastDetails forecast={[day]} selectedDay={0} tempUnit="°C" />);
  expect(screen.getByText('75°C / 57°C')).toBeInTheDocument();
  expect(screen.getByText('0 km/h')).toBeInTheDocument();
});

it('classifies equivalent metric and imperial wind speeds identically', () => {
  expect(getWindSeverity(32.18688, 'km/h')).toEqual(getWindSeverity(20, 'mph'));
});
