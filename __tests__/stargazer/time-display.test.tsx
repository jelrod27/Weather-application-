import { render, screen } from '@testing-library/react';
import { formatTime, formatDate, nextCalendarDate } from '@/lib/stargazer/format';
import SkyEvents from '@/components/stargazer/SkyEvents';
import HourlyTimeline from '@/components/stargazer/HourlyTimeline';
import { calculateDarkWindow } from '@/lib/stargazer/astronomy';

it('formats an instant in the viewed location across midnight', () => {
  const instant = new Date('2026-09-26T03:30:00Z');
  expect(formatTime(instant, 'America/New_York')).toBe('23:30');
  expect(formatDate(instant, 'America/New_York')).toBe('Sep 25');
  expect(formatTime(instant, 'Europe/London')).toBe('04:30');
});

it('honors daylight saving transitions and safely handles missing times', () => {
  expect(formatTime(new Date('2026-03-08T06:30:00Z'), 'America/New_York')).toBe('01:30');
  expect(formatTime(new Date('2026-03-08T07:30:00Z'), 'America/New_York')).toBe('03:30');
  expect(formatTime(null, 'America/New_York')).toBe('--:--');
  expect(formatTime(new Date('invalid'), 'Invalid/Zone')).toBe('--:--');
});

it('labels astronomical dusk to dawn as the dark window', () => {
  render(<HourlyTimeline conditions={[{ time: new Date('2026-09-26T01:00:00Z'), cloudCover: 0, cloudCoverLow: 0, cloudCoverMid: 0, cloudCoverHigh: 0, seeing: 1, transparency: 1, windSpeed: 0, humidity: 50, temperature: 10, dewpoint: 0, dewRisk: 'low' }]} timeZone="America/New_York" darkWindow={{
    sunset: new Date('2026-09-25T22:00:00Z'), sunrise: new Date('2026-09-26T10:00:00Z'),
    astronomicalDusk: new Date('2026-09-26T00:00:00Z'), astronomicalDawn: new Date('2026-09-26T08:00:00Z'),
  }} />);
  expect(screen.getByText(/Dark window:/)).toHaveTextContent('20:00 – 04:00');
});

it('does not substitute sunset for missing astronomical darkness in summer', () => {
  const result = calculateDarkWindow(59.33, 18.07, new Date('2026-06-21T12:00:00Z'));
  expect(result.status).toBe('none');
  expect(result.astronomicalDusk.getTime()).toBe(result.astronomicalDawn.getTime());
});

it.each(['2026-12-21T11:00:00Z', '2026-12-21T23:00:00Z'])('finds real astronomical crossings during polar night at %s', (now) => {
  const result = calculateDarkWindow(69.65, 18.96, new Date(now));
  expect(result.status).toBe('normal');
  const hours = (result.astronomicalDawn.getTime() - result.astronomicalDusk.getTime()) / 3600000;
  expect(hours).toBeGreaterThan(12);
  expect(hours).toBeLessThan(16);
});

it('recognizes genuinely continuous astronomical darkness', () => {
  expect(calculateDarkWindow(89, 0, new Date('2026-12-21T12:00:00Z')).status).toBe('continuous');
});

it('preserves calendar-only sky events across viewer time zones', () => {
  render(<SkyEvents timeZone="America/Los_Angeles" events={[{
    type: 'meteor_shower', title: 'Perseids', description: 'Approximate peak',
    date: new Date('2026-08-12T00:00:00Z'), calendarDate: '2026-08-12',
  }]} />);
  expect(screen.getByText('Aug 12, 2026')).toBeInTheDocument();
});

it('keeps a peak occurring today instead of skipping to next year', () => {
  expect(nextCalendarDate(8, 12, 'America/Los_Angeles', new Date('2026-08-13T01:00:00Z'))).toBe('2026-08-12');
  expect(nextCalendarDate(8, 12, 'Asia/Tokyo', new Date('2026-08-13T01:00:00Z'))).toBe('2027-08-12');
});
