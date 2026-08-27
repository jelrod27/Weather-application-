/**
 * Unit tests for SpaceWeatherCharts component
 */

import React from 'react';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';

// Mock recharts to avoid rendering issues in jsdom
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  LineChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="line-chart">{children}</div>
  ),
  AreaChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="area-chart">{children}</div>
  ),
  Line: () => <div data-testid="line" />,
  Area: () => <div data-testid="area" />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  CartesianGrid: () => <div />,
  Tooltip: () => <div />,
  ReferenceLine: () => <div />,
}));

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

import SpaceWeatherCharts from '@/components/space-weather/SpaceWeatherCharts';

describe('SpaceWeatherCharts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: all fetches return empty arrays
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });
  });

  it('should render the component heading', async () => {
    render(<SpaceWeatherCharts />);
    expect(screen.getByText('Space Weather Charts')).toBeDefined();
  });

  it('should render time range selector buttons', () => {
    render(<SpaceWeatherCharts />);
    const ranges = ['30M', '1H', '2H', '6H', '24H', '7D'];
    for (const label of ranges) {
      expect(screen.getByLabelText(`Set time range to ${label}`)).toBeDefined();
    }
  });

  it('should render the Earth position marker text', () => {
    render(<SpaceWeatherCharts />);
    expect(screen.getByText(/Earth ~72min propagation from DSCOVR at L1/)).toBeDefined();
  });

  it('should fetch data from all four endpoints on mount and render 10 chart titles', async () => {
    const now = new Date().toISOString();
    const plasmaData = [
      { time_tag: now, speed: 400, density: 5.2, temperature: 120000, bz_gsm: -3.1, bx_gsm: 1.2, by_gsm: -0.5, bt: 4.5 },
    ];
    const protonData = [{ time_tag: now, flux: 0.5 }];
    const magnetometerData = [{ time: now, hp: 45.2 }];
    const xrayData = { data: { recent: [{ timeTag: now, flux: 1.2e-6 }] } };

    mockFetch.mockImplementation((url: string) => {
      if (url.includes('plasma')) return Promise.resolve({ ok: true, json: () => Promise.resolve(plasmaData) });
      if (url.includes('proton-flux')) return Promise.resolve({ ok: true, json: () => Promise.resolve(protonData) });
      if (url.includes('magnetometer')) return Promise.resolve({ ok: true, json: () => Promise.resolve(magnetometerData) });
      if (url.includes('xray-flux')) return Promise.resolve({ ok: true, json: () => Promise.resolve(xrayData) });
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    });

    await act(async () => {
      render(<SpaceWeatherCharts />);
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(4);
    });

    const expectedTitles = [
      'Bz Component', 'GOES Magnetometer Hp', 'Solar Wind Speed', 'Proton Density',
      'Bx Component', 'By Component', 'Bt Total Field', 'Temperature',
      'X-ray Flux', 'Proton Flux',
    ];
    for (const title of expectedTitles) {
      expect(screen.getByText(title)).toBeDefined();
    }
  });

  it('should re-fetch data when time range is changed', async () => {
    await act(async () => {
      render(<SpaceWeatherCharts />);
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(4);
    });

    // Change range to 6H
    await act(async () => {
      fireEvent.click(screen.getByLabelText('Set time range to 6H'));
    });

    await waitFor(() => {
      // 4 initial + 4 for range change = 8
      expect(mockFetch).toHaveBeenCalledTimes(8);
    });

    // Verify the plasma endpoint was called with the new range
    const plasmaCalls = mockFetch.mock.calls.filter((c: string[]) => c[0].includes('plasma'));
    expect(plasmaCalls[1][0]).toContain('range=6h');
  });

  it('should show error state when all fetches fail', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    await act(async () => {
      render(<SpaceWeatherCharts />);
    });

    await waitFor(() => {
      expect(screen.getByText(/Failed to fetch space weather data/i)).toBeDefined();
    });

    expect(screen.getByText('Retry')).toBeDefined();
  });

  it('should show loading skeletons while fetching', () => {
    // Never resolve the fetch so we stay in loading state
    mockFetch.mockReturnValue(new Promise(() => {}));
    render(<SpaceWeatherCharts />);
    const loadingElements = screen.getAllByText('Loading...');
    expect(loadingElements.length).toBe(10);
  });
});
