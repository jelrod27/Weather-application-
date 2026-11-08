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
    <svg data-testid="line-chart">{children}</svg>
  ),
  AreaChart: ({ children }: { children: React.ReactNode }) => (
    <svg data-testid="area-chart">{children}</svg>
  ),
  Line: () => <g data-testid="line" />,
  Area: () => <g data-testid="area" />,
  XAxis: () => <g />,
  YAxis: () => <g />,
  CartesianGrid: () => <g />,
  Tooltip: () => <g />,
  ReferenceLine: () => <g />,
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
    await act(async () => { render(<SpaceWeatherCharts />); });
    expect(screen.getByText('Space Weather Charts')).toBeDefined();
  });

  it('should render time range selector buttons', async () => {
    await act(async () => { render(<SpaceWeatherCharts />); });
    const ranges = ['30M', '1H', '2H', '6H', '24H', '7D'];
    for (const label of ranges) {
      expect(screen.getByLabelText(`Set time range to ${label}`)).toBeDefined();
    }
  });

  it('should render the Earth position marker text', async () => {
    await act(async () => { render(<SpaceWeatherCharts />); });
    expect(screen.getByText(/Solar wind at L1: Earth arrival depends on wind speed and propagation/)).toBeDefined();
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

  it('uses the newest observation for the headline even if points arrive newest first', async () => {
    mockFetch.mockImplementation((url: string) => Promise.resolve({
      ok: true,
      json: async () => url.includes('plasma') ? {
        data: [{ time: tag(1), speed: 706 }, { time: tag(90), speed: 680 }],
        spacecraft: 'SOLAR1',
      } : { data: [] },
    }));
    render(<SpaceWeatherCharts />);
    expect(await screen.findByText('706 km/s')).toBeInTheDocument();
    expect(screen.queryByText('680 km/s')).not.toBeInTheDocument();
  });

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

describe('SpaceWeatherCharts observation coverage', () => {
 beforeEach(()=>jest.clearAllMocks())
 afterEach(()=>jest.useRealTimers())
 it('excludes future readings and reports each available observation window',async()=>{
  const now=Date.now()
  mockFetch.mockImplementation((url:string)=>Promise.resolve({ok:true,json:async()=>url.includes('plasma')?{data:[
   {time:new Date(now-60_000).toISOString(),speed:706},
   {time:new Date(now+60_000).toISOString(),speed:999},
  ]}:{data:[]}}))
  render(<SpaceWeatherCharts/> )
  expect(await screen.findByText('706 km/s')).toBeInTheDocument()
  expect(screen.queryByText('999 km/s')).not.toBeInTheDocument()
  expect(screen.getByText(/Observed UTC:/)).toBeInTheDocument()
  expect(screen.getAllByText('No data available').length).toBeGreaterThan(0)
 })
 it('refreshes observations while charts remain mounted',async()=>{
  jest.useFakeTimers()
  mockFetch.mockResolvedValue({ok:true,json:async()=>({data:[]})})
  await act(async()=>{render(<SpaceWeatherCharts/> )})
  expect(mockFetch).toHaveBeenCalledTimes(4)
  await act(async()=>{jest.advanceTimersByTime(60_000)})
  expect(mockFetch).toHaveBeenCalledTimes(8)
 })
})

describe('SpaceWeatherCharts background refresh', () => {
  const response = (url: string, speed = 700) => ({
    ok: true,
    json: async () => {
      const time = new Date(Date.now() - 60_000).toISOString();
      if (url.includes('plasma')) return {
        data: [{ time, speed, density: 5, temperature: 120000, bz: -3, bx: 1, by: 2, bt: 4 }],
        source: 'NOAA SWPC (RTSW)',
      };
      if (url.includes('magnetometer')) return { data: [{ time, hp: 45 }], source: 'GOES' };
      if (url.includes('xray-flux')) return { data: { recent: [{ timeTag: time, flux: 1e-6 }] }, source: 'GOES' };
      return { data: [{ time, flux: 0.5 }], source: 'GOES' };
    },
  });

  function deferRequests() {
    const requests: {
      url: string;
      resolve: (value: ReturnType<typeof response>) => void;
      reject: (reason: Error) => void;
    }[] = [];
    mockFetch.mockImplementation((url: string) => new Promise((resolve, reject) => {
      requests.push({ url, resolve, reject });
    }));
    return requests;
  }

  beforeEach(() => {
    jest.useFakeTimers();
    mockFetch.mockReset();
    mockFetch.mockImplementation((url: string) => Promise.resolve(response(url)));
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('keeps observations mounted while a scheduled refresh is pending and updates them when it finishes', async () => {
    await act(async () => { render(<SpaceWeatherCharts />); });
    const reading = screen.getByText('700 km/s');
    const requests = deferRequests();

    await act(async () => { jest.advanceTimersByTime(60_000); });

    expect(screen.queryAllByText('Loading...')).toHaveLength(0);
    expect(screen.getByText('700 km/s')).toBe(reading);
    await act(async () => {
      requests.forEach(request => request.resolve(response(request.url, 710)));
    });
    expect(screen.getByText('710 km/s')).toBe(reading);
  });

  it('keeps previous observations with an explicit refresh failure until a successful refresh', async () => {
    await act(async () => { render(<SpaceWeatherCharts />); });
    const reading = screen.getByText('700 km/s');
    mockFetch.mockRejectedValue(new Error('Offline'));

    await act(async () => { jest.advanceTimersByTime(60_000); });

    expect(screen.getByText('700 km/s')).toBe(reading);
    expect(screen.getByRole('alert')).toHaveTextContent(/failed to refresh/i);
    expect(screen.getByRole('alert')).toHaveTextContent(/previous observations.*out of date/i);
    expect(screen.getAllByText(/Observed UTC:/)).toHaveLength(10);

    const requests = deferRequests();
    await act(async () => { jest.advanceTimersByTime(60_000); });
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('700 km/s')).toBe(reading);

    await act(async () => {
      requests.forEach(request => request.resolve(response(request.url, 720)));
    });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByText('720 km/s')).toBeInTheDocument();
  });

  it('clears a failed source on a partial refresh instead of implying its old observations refreshed', async () => {
    await act(async () => { render(<SpaceWeatherCharts />); });
    mockFetch.mockImplementation((url: string) => url.includes('plasma')
      ? Promise.reject(new Error('Plasma offline'))
      : Promise.resolve(response(url)));

    await act(async () => { jest.advanceTimersByTime(60_000); });

    expect(screen.queryByText('700 km/s')).not.toBeInTheDocument();
    expect(screen.getByText('-- km/s')).toBeInTheDocument();
    expect(screen.getByText('45.0 nT')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(/unavailable.*solar wind plasma/i);
    expect(screen.getAllByText('Feed unavailable')).toHaveLength(7);

    mockFetch.mockImplementation((url: string) => Promise.resolve(response(url, 730)));
    await act(async () => { jest.advanceTimersByTime(60_000); });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByText('Feed unavailable')).not.toBeInTheDocument();
    expect(screen.getByText('730 km/s')).toBeInTheDocument();
  });

  it('ignores an old background response after a range change while the foreground load finishes within its deadline', async () => {
    await act(async () => { render(<SpaceWeatherCharts />); });
    const oldRequests = deferRequests();
    await act(async () => { jest.advanceTimersByTime(60_000); });

    const rangeRequests = deferRequests();
    await act(async () => { fireEvent.click(screen.getByLabelText('Set time range to 6H')); });
    await act(async () => {
      oldRequests.forEach(request => request.resolve(response(request.url, 999)));
    });
    expect(screen.queryByText('999 km/s')).not.toBeInTheDocument();
    expect(screen.getAllByText('Loading...')).toHaveLength(10);

    await act(async () => { jest.advanceTimersByTime(29_999); });
    await act(async () => {
      rangeRequests.slice(0, 4).forEach(request => request.resolve(response(request.url, 850)));
    });
    expect(screen.queryAllByText('Loading...')).toHaveLength(0);
    expect(screen.getByText('850 km/s')).toBeInTheDocument();
  });

  it.each(['network', 'body'])('bounds a hung %s request and displays successful feeds after the deadline', async (hang) => {
    let plasmaSignal: AbortSignal | null | undefined;
    let resolveLate: ((value: ReturnType<typeof response>) => void) | undefined;
    mockFetch.mockImplementation((url: string, options?: RequestInit) => {
      if (!url.includes('plasma')) return Promise.resolve(response(url));
      plasmaSignal = options?.signal;
      if (hang === 'network') return new Promise(resolve => { resolveLate = resolve; });
      return Promise.resolve({ ok: true, json: () => new Promise(() => {}) });
    });
    await act(async () => { render(<SpaceWeatherCharts />); });
    await act(async () => { jest.advanceTimersByTime(29_999); });
    expect(screen.getAllByText('Loading...')).toHaveLength(10);

    await act(async () => { jest.advanceTimersByTime(1); });

    expect(screen.queryAllByText('Loading...')).toHaveLength(0);
    expect(screen.getByText('45.0 nT')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(/unavailable.*solar wind plasma/i);
    expect(screen.getAllByText('Feed unavailable')).toHaveLength(7);
    expect(plasmaSignal?.aborted).toBe(true);

    await act(async () => { resolveLate?.(response('/plasma', 999)); });
    expect(screen.queryByText('999 km/s')).not.toBeInTheDocument();
  });

  it('releases polling after all background requests time out and clears the old-data warning on recovery', async () => {
    await act(async () => { render(<SpaceWeatherCharts />); });
    const reading = screen.getByText('700 km/s');
    const signals: (AbortSignal | null | undefined)[] = [];
    mockFetch.mockImplementation((_url: string, options?: RequestInit) => {
      signals.push(options?.signal);
      return new Promise(() => {});
    });
    await act(async () => { jest.advanceTimersByTime(60_000); });
    expect(screen.getByText('700 km/s')).toBe(reading);
    await act(async () => { jest.advanceTimersByTime(30_000); });

    expect(screen.getByRole('alert')).toHaveTextContent(/previous observations.*out of date/i);
    expect(screen.getByText('700 km/s')).toBe(reading);
    expect(signals).toHaveLength(4);
    expect(signals.every(signal => signal?.aborted)).toBe(true);

    mockFetch.mockImplementation((url: string) => Promise.resolve(response(url, 740)));
    await act(async () => { jest.advanceTimersByTime(30_000); });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByText('740 km/s')).toBe(reading);
  });

  it('clears request deadlines after success so completed requests are not aborted later', async () => {
    const timeoutSpy = jest.spyOn(global, 'setTimeout');
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
    const signals: (AbortSignal | null | undefined)[] = [];
    mockFetch.mockImplementation((url: string, options?: RequestInit) => {
      signals.push(options?.signal);
      return Promise.resolve(response(url));
    });
    const { unmount } = await act(async () => render(<SpaceWeatherCharts />));
    const deadlines = timeoutSpy.mock.calls.flatMap((call, index) =>
      call[1] === 30_000 ? [timeoutSpy.mock.results[index].value] : []);
    expect(deadlines).toHaveLength(4);
    for (const deadline of deadlines) expect(clearTimeoutSpy).toHaveBeenCalledWith(deadline);
    await act(async () => { jest.advanceTimersByTime(30_000); });
    expect(signals).toHaveLength(4);
    expect(signals.every(signal => signal?.aborted === false)).toBe(true);
    unmount();
  });
});
