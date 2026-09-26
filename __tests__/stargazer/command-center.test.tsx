import { render, screen } from '@testing-library/react';
import StargazerCommandCenter from '@/components/stargazer/StargazerCommandCenter';
import { useStargazerController } from '@/hooks/useStargazerController';
import type { StargazerData } from '@/lib/stargazer/types';

jest.mock('@/hooks/useStargazerController');

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
    data: value, isLoading: false, error: null, activeTab: 'events', searchQuery: '',
    setSearchQuery: jest.fn(), isSearching: false, handleTabChange: jest.fn(), handleLocationSearch: jest.fn(),
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
  const { rerender } = render(<StargazerCommandCenter />);
  expect(screen.getAllByText('Good').length).toBeGreaterThan(0);
  expect(screen.getByText('transparency')).toBeInTheDocument();
  setData({
    ...data, darkWindow: { ...data.darkWindow, status: 'none' }, nightAverage: null,
    score: { overall: null, label: 'Unavailable', color: '#9ca3af', summary: 'No astronomical darkness at this location tonight.', subScores: null },
  });
  rerender(<StargazerCommandCenter />);
  expect(screen.getByText('Unavailable')).toBeInTheDocument();
  expect(screen.getByText('--')).toHaveClass('text-muted-foreground');
  expect(screen.getByText('No astronomical darkness at this location tonight.')).toBeInTheDocument();
  expect(screen.queryByText('Good')).not.toBeInTheDocument();
  expect(screen.queryByText('transparency')).not.toBeInTheDocument();
  expect(screen.queryByText(/night avg:/)).not.toBeInTheDocument();
});
