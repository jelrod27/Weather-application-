import { render, screen } from '@testing-library/react';
import HourlyForecast from '@/components/hourly-forecast';
import Forecast from '@/components/forecast';

describe('forecast time and missing readings', () => {
  it('renders a moon at the forecast location at night and a sun after sunrise', () => {
    const hour = { time: '', temp: 20, condition: 'Clear', description: 'clear sky', precipChance: 0 };
    render(<HourlyForecast timezone="Asia/Tokyo" hourly={[
      { ...hour, dt: Date.parse('2026-09-25T15:00:00Z') / 1000, isDay: false, icon: '01d' },
      { ...hour, dt: Date.parse('2026-09-25T22:00:00Z') / 1000, isDay: true, icon: '01n' },
    ]} />);
    const night = screen.getByRole('img', { name: 'Weather: Clear (night)' });
    const day = screen.getByRole('img', { name: 'Weather: Clear' });
    // Assert the rendered shapes too: changing only an accessible label is not a fix.
    expect(night.querySelector('path')).not.toBeNull();
    expect(day.querySelector('circle[r="10"]')).not.toBeNull();
    expect(screen.getByText('12 AM')).toBeInTheDocument();
    expect(screen.getByText('7 AM')).toBeInTheDocument();
  });

  it('preserves legacy nighttime icons and rainy conditions', () => {
    render(<HourlyForecast hourly={[{
      dt: Date.parse('2026-09-25T15:00:00Z') / 1000, time: '12 AM', temp: 20,
      condition: 'Rain', description: 'rain', precipChance: 80, icon: '10n',
    }]} />);
    expect(screen.getByRole('img', { name: 'Weather: Rain (night)' })).toBeInTheDocument();
  });

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
