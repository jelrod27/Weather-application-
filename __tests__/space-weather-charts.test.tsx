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
    // Envelopes as the routes actually send them: `{ data, source }`, with the
    // field names our own routes emit rather than NOAA's raw spellings.
    const plasmaData = {
      data: [
        { time: now, speed: 400, density: 5.2, temperature: 120000, bz: -3.1, bx: 1.2, by: -0.5, bt: 4.5 },
      ],
      range: '2h',
      source: 'NOAA SWPC (RTSW)',
      magneticAvailable: true,
    };
    const protonData = { data: [{ time: now, flux: 0.5 }], source: 'GOES' };
    const magnetometerData = { data: [{ time: now, hp: 45.2 }], source: 'GOES' };
    const xrayData = { data: { recent: [{ timeTag: now, flux: 1.2e-6 }] }, source: 'GOES' };

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

/**
 * The regression this file previously let through.
 *
 * Every route answers with a `{ data, source }` envelope, but the component
 * read the body as the series and gated on `Array.isArray`, so plasma, proton
 * flux and magnetometer were always `[]`. The chart *titles* still rendered,
 * which is why the assertions above passed while three charts on the site's
 * highest-impression page had never plotted a point. Assert on the data.
 */
describe('SpaceWeatherCharts renders live values from real route envelopes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /** A SWPC-style tag: no zone, meaning UTC, a minute ago. */
  const tag = (minutesAgo: number) =>
    new Date(Date.now() - minutesAgo * 60_000).toISOString().slice(0, 19);

  const respondWithRealEnvelopes = () => {
    const points = [tag(3), tag(2), tag(1)];
    const plasma = {
      data: points.map((time, i) => ({
        time,
        speed: 480 + i,
        density: 6.7,
        temperature: 117171,
        bz: -0.7,
        by: 1.2,
        bx: 0.3,
        bt: 5.7,
      })),
      range: '2h',
      source: 'NOAA SWPC (RTSW)',
      magneticAvailable: true,
    };
    const proton = { data: points.map((time) => ({ time, flux: 0.21 })), source: 'GOES' };
    const magnetometer = { data: points.map((time) => ({ time, hp: 45.2 })), source: 'GOES' };
    const xray = {
      data: { recent: points.map((timeTag) => ({ timeTag, flux: 5.2e-7 })) },
      source: 'GOES',
    };

    mockFetch.mockImplementation((url: string) => {
      const body = url.includes('plasma')
        ? plasma
        : url.includes('proton-flux')
          ? proton
          : url.includes('magnetometer')
            ? magnetometer
            : xray;
      return Promise.resolve({ ok: true, json: () => Promise.resolve(body) });
    });
  };

  it('plots every chart instead of falling back to "No data available"', async () => {
    respondWithRealEnvelopes();

    await act(async () => {
      render(<SpaceWeatherCharts />);
    });
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(4));

    expect(screen.queryAllByText('No data available')).toHaveLength(0);
  });

  it('shows the current reading for each source', async () => {
    respondWithRealEnvelopes();

    await act(async () => {
      render(<SpaceWeatherCharts />);
    });
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(4));

    // One value per dataset, so a broken envelope on any of the four fails.
    expect(screen.getAllByText(/482/).length).toBeGreaterThan(0); // plasma speed
    expect(screen.getAllByText(/45\.2/).length).toBeGreaterThan(0); // magnetometer hp
    expect(screen.getAllByText(/6\.7/).length).toBeGreaterThan(0); // plasma density
    expect(screen.getAllByText(/-0\.7/).length).toBeGreaterThan(0); // plasma bz
  });

  it('keeps points that carry a zone-less UTC tag, whatever the viewer timezone', async () => {
    // `new Date('2026-09-08T15:54:00')` resolves in the viewer's zone; east of
    // UTC that pushed every point outside the 30m window and emptied the charts.
    respondWithRealEnvelopes();

    await act(async () => {
      render(<SpaceWeatherCharts />);
    });
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(4));

    await act(async () => {
      fireEvent.click(screen.getByLabelText('Set time range to 30M'));
    });
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(8));

    expect(screen.queryAllByText('No data available')).toHaveLength(0);
  });
});
