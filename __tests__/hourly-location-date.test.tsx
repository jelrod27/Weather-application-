import { render, screen } from '@testing-library/react';
import HourlyForecast from '@/components/hourly-forecast';
import Forecast from '@/components/forecast';

describe('forecast time and missing readings', () => {
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

  it('shows unavailable hourly readings separately from measured zeroes', () => {
    const hour = { dt: Date.parse('2026-09-25T15:00:00Z') / 1000, time: '12 AM', condition: 'Clouds', description: 'cloudy' };
    render(<HourlyForecast hourly={[
      { ...hour, temp: null, precipChance: null },
      { ...hour, dt: hour.dt + 3600, time: '1 AM', temp: 0, precipChance: 0 },
    ]} />);
    expect(screen.getByLabelText('Temperature unavailable')).toBeInTheDocument();
    expect(screen.getByText('Chance unavailable')).toBeInTheDocument();
    expect(screen.getByText('0°F')).toBeInTheDocument();
    expect(screen.getByText('0%')).toBeInTheDocument();
  });
});
