import { render, screen } from '@testing-library/react';
import { getTodayForecast } from '@/lib/weather/daily-forecast';
import Forecast from '@/components/forecast';
import ForecastDetails from '@/components/forecast-details';
import type { ForecastDay } from '@/lib/types';

const day: ForecastDay = {
  day: 'Saturday', highTemp: 65, lowTemp: 50, condition: 'Clouds', description: 'cloudy',
};

it('shows unavailable daily metrics instead of inventing dry conditions', () => {
  render(<ForecastDetails forecast={[day]} selectedDay={0} />);
  expect(screen.queryByText('0%')).not.toBeInTheDocument();
  expect(screen.getAllByText('Unavailable')).toHaveLength(5);
});

it('keeps measured zero rain, humidity, wind and UV visible', () => {
  render(<ForecastDetails forecast={[{ ...day, details: { precipitationChance: 0, humidity: 0, windSpeed: 0, uvIndex: 0 } }]} selectedDay={0} />);
  expect(screen.getAllByText('0%')).toHaveLength(2);
  expect(screen.getByText('0 mph')).toBeInTheDocument();
  expect(screen.getByText('0')).toBeInTheDocument();
});

it('does not crash when a refreshed forecast no longer contains the selected day', () => {
  const { container } = render(<ForecastDetails forecast={[]} selectedDay={4} />);
  expect(container).toBeEmptyDOMElement();
});


it('displays the selected day solar events', () => {
  render(<ForecastDetails forecast={[{ ...day, sunrise: '6:50 am', sunset: '7:16 pm' }]} selectedDay={0} />);
  expect(screen.getByText('6:50 am')).toBeInTheDocument();
  expect(screen.getByText('7:16 pm')).toBeInTheDocument();
});

it('keeps six available days and their supplied dates after a missing day', () => {
  render(<Forecast forecast={Array.from({ length: 6 }, (_, index) => ({
    ...day, date: `2026-09-${26 + index}`, day: `Day ${index}`,
  }))} />);
  expect(screen.getAllByRole('button')).toHaveLength(6);
  expect(screen.getByText('6-DAY FORECAST')).toBeInTheDocument();
  expect(screen.getByText('9.26.26')).toBeInTheDocument();
});

it('does not promote tomorrow into today when today is missing', () => {
  expect(getTodayForecast({ currentDate: '2026-09-25', forecast: [{ ...day, date: '2026-09-26' }] })).toBeUndefined();
  expect(getTodayForecast({ currentDate: '2026-09-26', forecast: [{ ...day, date: '2026-09-26' }] })?.day).toBe('Saturday');
});
