import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { OutdoorPlanner } from '@/components/outdoor-planner';
import type { WeatherData } from '@/lib/types';

const NOW = Date.parse('2026-09-26T08:15:00Z');
const START = Date.parse('2026-09-26T08:00:00Z') / 1000;
const fixture: Pick<WeatherData, 'location' | 'unit' | 'timezone' | 'hourlyForecast'> = {
  location: 'London', unit: '°C', timezone: 'Europe/London',
  hourlyForecast: Array.from({ length: 48 }, (_, i) => ({
    dt: START + i * 3600, time: 'unused', temp: 20, windSpeed: 0,
    precipChance: 0, weatherCode: 2, condition: 'Clouds', description: 'partly cloudy',
  })),
};

beforeEach(() => { jest.useFakeTimers(); jest.setSystemTime(NOW); });
afterEach(() => { jest.useRealTimers(); });

describe('outdoor planner controls and explanations', () => {
  it('shows local dates, measured zeroes, and honest hourly probability labels', () => {
    render(<OutdoorPlanner weather={fixture} onSelectHour={jest.fn()} />);
    const planner = screen.getByRole('region', { name: 'Plan time outdoors' });
    expect(within(planner).getByRole('status')).toHaveTextContent('London');
    expect(within(planner).getByText(/Saturday, Sep 26/)).toBeInTheDocument();
    expect(within(planner).getAllByText('0%')).toHaveLength(3);
    expect(within(planner).getAllByText('0 km/h')).toHaveLength(3);
    expect(within(planner).getAllByText('Highest hourly chance')).toHaveLength(3);
    expect(within(planner).getByText(/10:00 AM.*12:00 PM/)).toBeInTheDocument();
    expect(within(planner).getByText(/not the probability for the whole outing/)).toBeInTheDocument();
  });

  it('updates day and duration and opens the matching hourly reading', () => {
    const select = jest.fn();
    render(<OutdoorPlanner weather={fixture} onSelectHour={select} />);
    fireEvent.click(screen.getByRole('button', { name: 'Tomorrow' }));
    expect(screen.getByRole('button', { name: 'Tomorrow' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText(/Sunday, Sep 27/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '1 hour' }));
    expect(screen.getByText(/6:00 AM.*7:00 AM/)).toBeInTheDocument();
    const link = screen.getAllByRole('link', { name: /View hourly readings/ })[0];
    expect(link).toHaveAttribute('href', '#selected-hour-details');
    fireEvent.click(link);
    expect(select).toHaveBeenCalledWith(Date.parse('2026-09-27T05:00:00Z') / 1000);
  });

  it('removes elapsed windows as time advances and explains unavailable data', () => {
    const { rerender } = render(<OutdoorPlanner weather={fixture} onSelectHour={jest.fn()} />);
    act(() => { jest.setSystemTime(Date.parse('2026-09-26T21:15:00Z')); jest.advanceTimersByTime(60000); });
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
    expect(screen.getByText(/No complete future 2-hour windows/)).toBeInTheDocument();
    rerender(<OutdoorPlanner weather={{ ...fixture, hourlyForecast: [] }} onSelectHour={jest.fn()} />);
    expect(screen.getByText(/Recent hourly readings are unavailable/)).toBeInTheDocument();
    rerender(<OutdoorPlanner weather={{ ...fixture, timezone: undefined }} onSelectHour={jest.fn()} />);
    expect(screen.getByText(/location’s time zone is unavailable/)).toBeInTheDocument();
  });

  it('uses imperial labels and exposes omitted hazardous periods without suggesting an all-clear', () => {
    const hours = fixture.hourlyForecast!.map(h => ({ ...h, temp: 68, windSpeed: 5, weatherCode: 95 }));
    const { rerender } = render(<OutdoorPlanner weather={{ ...fixture, unit: '°F', hourlyForecast: hours }} onSelectHour={jest.fn()} />);
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
    expect(screen.getByText(/Some periods were omitted/)).toHaveTextContent(/thunderstorms/);
    rerender(<OutdoorPlanner weather={{ ...fixture, unit: '°F', hourlyForecast: hours.map(h => ({ ...h, weatherCode: 2 })) }} onSelectHour={jest.fn()} />);
    expect(screen.getAllByText('68°F')).toHaveLength(3);
    expect(screen.getAllByText('5 mph')).toHaveLength(3);
    expect(screen.getByText(/Check alerts and local conditions/)).toBeInTheDocument();
  });
});
