import { render, screen } from '@testing-library/react';
import StargazerCommandCenter from '@/components/stargazer/StargazerCommandCenter';
import { useStargazerController } from '@/hooks/useStargazerController';
import type { StargazerData } from '@/lib/stargazer/types';
import catalog from '@/data/deep-sky-catalog.json';

jest.mock('@/hooks/useStargazerController');
jest.mock('@/lib/auth', () => ({ useAuth: () => ({ preferences: null }) }));

const mockController = jest.mocked(useStargazerController);
const date = new Date('2026-08-13T06:59:00Z');
const data: StargazerData = {
  score: { overall: 70, label: 'Good', color: '#00ff00', summary: 'Good conditions', subScores: { cloud: 80, moon: 60, seeing: 70, transparency: 70, ground: 80 } },
  bestWindow: null, nightAverage: 70, limitingFactor: null,
  darkWindow: { status: 'normal', sunset: date, sunrise: date, astronomicalDusk: date, astronomicalDawn: date },
  moon: { phaseName: 'New Moon', phaseAngle: 0, illumination: 0, rise: null, set: null, moonUpDuringDarkWindowPercent: 0, darkWindowStart: date, darkWindowEnd: date, nextNewMoon: date, nextFullMoon: date },
  hourlyConditions: [], planets: [], deepSkyHighlights: [], skyEvents: [], issPasses: [], launches: [],
  meteorShowers: [{ name: 'Perseids', peak: 'August 12', peakMonth: 8, peakDay: 12, activeStart: 'July 17', activeEnd: 'August 24', zhr: 100, speed: 59, radiantConstellation: 'Perseus', radiantRA: 48, radiantDec: 58, parentBody: 'Swift-Tuttle', description: '', moonInterference: 'none', moonIlluminationAtPeak: 0 }],
  location: { lat: 37, lon: -122, timezone: 'America/Los_Angeles' },
  generatedAt: date.toISOString(),
};

function setData(value: StargazerData): void {
  mockController.mockReturnValue({
    invalidSharedTime: false, acknowledgeSharedTime: jest.fn(),
    data: value, receivedAt: date.getTime(), isLoading: false, error: null, activeTab: 'events', searchQuery: '',
    setSearchQuery: jest.fn(), isSearching: false, handleTabChange: jest.fn(), handleLocationSearch: jest.fn(), handleDeviceLocation: jest.fn(), refresh: jest.fn(),
  });
}

afterEach(() => jest.useRealTimers());

it('keeps meteor dates stable when the browser crosses local midnight', () => {
  jest.useFakeTimers({ now: date });
  setData(data);
  const { rerender } = render(<StargazerCommandCenter />);
  expect(screen.getByText('Aug 12, 2026')).toBeInTheDocument();
  jest.setSystemTime(new Date('2026-08-13T07:01:00Z'));
  rerender(<StargazerCommandCenter />);
  expect(screen.getByText('Aug 12, 2026')).toBeInTheDocument();
  expect(screen.queryByText('Aug 12, 2027')).not.toBeInTheDocument();
});

it('replaces the rating and its bars with an unavailable state when no darkness exists', () => {
  setData(data);
  mockController.mockReturnValue({ ...mockController(), activeTab: 'conditions' });
  const { rerender } = render(<StargazerCommandCenter />);
  expect(screen.getAllByText('Good').length).toBeGreaterThan(0);
  expect(screen.getByText('transparency')).toBeInTheDocument();
  setData({
    ...data, darkWindow: { ...data.darkWindow, status: 'none' }, nightAverage: null,
    score: { overall: null, label: 'Unavailable', color: '#9ca3af', summary: 'No astronomical darkness at this location tonight.', subScores: null },
  });
  mockController.mockReturnValue({ ...mockController(), activeTab: 'conditions' });
  rerender(<StargazerCommandCenter />);
  expect(screen.getByText('Unavailable')).toBeInTheDocument();
  expect(screen.getByText('--')).toHaveClass('text-muted-foreground');
  expect(screen.getByText('No astronomical darkness at this location tonight.')).toBeInTheDocument();
  expect(screen.queryByText('Good')).not.toBeInTheDocument();
  expect(screen.queryByText('transparency')).not.toBeInTheDocument();
  expect(screen.queryByText(/night avg:/)).not.toBeInTheDocument();
});

it('carries the selected hour and equipment through the rendered target link', () => {
  window.history.replaceState(null, '', '/stargazer?at=2026-09-27T02%3A00%3A00Z&equipment=binoculars');
  const object = catalog.find(item => item.id === 'M31')!;
  setData({ ...data, deepSkyHighlights: [{ ...object, type: 'spiral_galaxy', difficulty: 'beginner', maxAltitude: 70, transitTime: date, transitsDuringDarkWindow: true }] });
  mockController.mockReturnValue({ ...mockController(), activeTab: 'targets' });
  render(<StargazerCommandCenter />);
  const href = screen.getByRole('link', { name: /M31 - Andromeda/ }).getAttribute('href')!;
  expect(new URL(href, 'https://example.test').searchParams.get('at')).toBe('2026-09-27T02:00:00.000Z');
  expect(href).toContain('equipment=binoculars');
});

it('does not label loaded coordinates with an unsubmitted search draft', () => {
  window.history.replaceState(null, '', '/stargazer?lat=51.5&lon=-0.12&q=London');
  const object = catalog.find(item => item.id === 'M31')!;
  setData({ ...data, location: { lat: 51.5, lon: -0.12 }, deepSkyHighlights: [{ ...object, type: 'spiral_galaxy', difficulty: 'beginner', maxAltitude: 70, transitTime: date, transitsDuringDarkWindow: true }] });
  mockController.mockReturnValue({ ...mockController(), activeTab: 'targets', searchQuery: 'Sydney' });
  render(<StargazerCommandCenter />);
  const href = screen.getByRole('link', { name: /M31 - Andromeda/ }).getAttribute('href')!;
  expect(new URL(href, 'https://example.test').searchParams.get('q')).toBe('London');
});
it('treats a just-received forecast as fresh after a slow initial request', () => {
  jest.useFakeTimers({ now: date });
  setData(data);
  mockController.mockReturnValue({ ...mockController(), data: null, isLoading: true, activeTab: 'start' });
  const { rerender } = render(<StargazerCommandCenter />);
  jest.setSystemTime(new Date(date.getTime() + 10000));
  setData({ ...data, beginnerNight: { hours: [{ start: date.getTime() + 3600000, end: date.getTime() + 7200000, midpoint: date.getTime() + 5400000,
    weather: { cloudLow: 0, cloudHigh: 10, temperatureLow: 10, temperatureHigh: 11, wind: 5, precipitation: 0, issues: [] },
    targets: [{ id: 'Moon', altitude: 40, azimuth: 180, minAltitude: 30, magnitude: -10 }],
  }] } });
  mockController.mockReturnValue({ ...mockController(), receivedAt: Date.now(), activeTab: 'start' });
  rerender(<StargazerCommandCenter />);
  expect(screen.getByRole('heading', { name: 'Try this hour' })).toBeInTheDocument();
});

it('keeps the resolved place above every tab when a search is only a draft', () => {
  setData({ ...data, location: { ...data.location, displayName: 'London' } });
  mockController.mockReturnValue({ ...mockController(), activeTab: 'events', searchQuery: 'Sydney' });
  render(<StargazerCommandCenter />);
  expect(screen.getByText('Observing place: London')).toBeInTheDocument();
  expect(screen.getByRole('textbox')).toHaveValue('Sydney');
});

it('distinguishes unavailable optional providers from an empty result', () => {
  setData({ ...data, optionalData: { iss: false, launches: false } });
  const { rerender } = render(<StargazerCommandCenter />);
  expect(screen.getByText('ISS pass data unavailable. Try refreshing later.')).toBeInTheDocument();
  setData({ ...data, optionalData: { iss: true, launches: true } });
  rerender(<StargazerCommandCenter />);
  expect(screen.getByText('No visible ISS passes calculated in the next few days.')).toBeInTheDocument();
  mockController.mockReturnValue({ ...mockController(), activeTab: 'launches', data: { ...data, optionalData: { iss: false, launches: false } } });
  rerender(<StargazerCommandCenter />);
  expect(screen.getByText('Launch schedule unavailable. Try refreshing later.')).toBeInTheDocument();
});

it('distinguishes photography periods that cross the repeated DST hour', () => {
  setData({ ...data, location: { ...data.location, timezone: 'America/New_York' }, bestWindow: { startTime: new Date('2026-11-01T05:00:00Z'), endTime: new Date('2026-11-01T06:00:00Z'), score: 70, label: 'Good', color: '#00ff00' } });
  mockController.mockReturnValue({ ...mockController(), activeTab: 'conditions' });
  render(<StargazerCommandCenter />);
  expect(screen.getByText(/Nov 1, 1:00 AM GMT-4.*Nov 1, 1:00 AM GMT-5/)).toBeInTheDocument();
});

it('labels a polar night with real twilight crossings as an observing night', () => {
  setData({ ...data, darkWindow: { status: 'normal', sunset: null, sunrise: null,
    astronomicalDusk: new Date('2026-12-21T14:56:00Z'), astronomicalDawn: new Date('2026-12-22T04:28:00Z') },
    location: { lat: 69.65, lon: 18.96, timezone: 'Europe/Oslo', displayName: 'Tromsø' } });
  render(<StargazerCommandCenter />);
  expect(screen.getByText(/Observing night: Dec 21, 2026 – Dec 22, 2026/)).toBeInTheDocument();
  expect(screen.queryByText(/Next 24 hours:/)).not.toBeInTheDocument();
});
