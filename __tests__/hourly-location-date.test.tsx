import { render, screen } from '@testing-library/react';
import HourlyForecast from '@/components/hourly-forecast';
import Forecast from '@/components/forecast';

it('uses the same location day as its midnight hour', () => {
  render(<HourlyForecast timezone="Asia/Tokyo" hourly={[{
    dt: Date.parse('2026-09-25T15:00:00Z') / 1000, time: '12 AM', temp: 20,
    condition: 'Clear', description: 'clear', precipChance: 0,
  }]} onSelectHour={jest.fn()} />);
  expect(screen.getByText('Sat')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Details for Sat, Sep 26, 12 AM/ })).toBeInTheDocument();
});

it('uses the forecast date rather than the browser current date and index', () => {
  render(<Forecast forecast={[{ date: '2026-09-26', day: 'Saturday', highTemp: 20, lowTemp: 10, condition: 'Clear', description: 'clear' }]} />);
  expect(screen.getByText('9.26.26')).toBeInTheDocument();
});
