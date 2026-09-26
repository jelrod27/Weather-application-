import { render, screen } from '@testing-library/react';
import HourlyTimeline from '@/components/stargazer/HourlyTimeline';
import { useAuth } from '@/lib/auth';
import type { HourlyCondition } from '@/lib/stargazer/types';

jest.mock('@/lib/auth', () => ({ useAuth: jest.fn() }));
const date = new Date('2026-09-27T01:00:00Z');
const hour: HourlyCondition = { time: date, cloudCover: 0, cloudCoverLow: null, cloudCoverMid: null, cloudCoverHigh: null, seeing: null, transparency: null, windSpeed: 36, humidity: 0, temperature: 0, dewpoint: null, dewRisk: null, precipitationProbability: 0, weatherCode: 0 };
const props = { conditions: [hour], darkWindow: { astronomicalDusk: date, astronomicalDawn: date, sunset: null, sunrise: null } };
it('renders missing metrics as unavailable and real zeroes as zero', () => {
  jest.mocked(useAuth).mockReturnValue({ preferences: { temperature_unit: 'celsius', wind_unit: 'ms' } } as ReturnType<typeof useAuth>);
  render(<HourlyTimeline {...props} />);
  expect(screen.getAllByText('Unavailable').length).toBeGreaterThan(0);
  expect(screen.getByText('0°C')).toBeInTheDocument();
  expect(screen.getByText('10 m/s')).toBeInTheDocument();
  expect(screen.getByText('Photography /100')).toBeInTheDocument();
  expect(screen.queryByText('NaN')).not.toBeInTheDocument();
});
it('honors independently saved temperature and wind preferences', () => {
  jest.mocked(useAuth).mockReturnValue({ preferences: { temperature_unit: 'fahrenheit', wind_unit: 'kmh' } } as ReturnType<typeof useAuth>);
  render(<HourlyTimeline {...props} />);
  expect(screen.getByText('32°F')).toBeInTheDocument();
  expect(screen.getByText('36 km/h')).toBeInTheDocument();
});
