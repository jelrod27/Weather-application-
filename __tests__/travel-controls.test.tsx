import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import TravelPage from '@/app/travel/page';
import type { DriveTripScore, FlyTripScore } from '@/components/travel/trip-types';

jest.mock('@/components/page-wrapper', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <main>{children}</main>,
}));
jest.mock('@/components/share-buttons', () => ({ ShareButtons: () => null }));
jest.mock('@/components/aviation', () => ({
  AirportMiseryBoard: () => <div>Live airport board</div>,
}));
jest.mock('react-intersection-observer', () => ({
  useInView: () => ({ ref: jest.fn(), inView: true }),
}));
jest.mock('next/dynamic', () => ({
  __esModule: true,
  default: () => function CorridorMap({ corridors }: { corridors: Array<{ name: string }> }) {
    return <div data-testid="corridor-map">{corridors.map(({ name }) => name).join(', ')}</div>;
  },
}));

const score: DriveTripScore['score'] = {
  score: 0, level: 'green', color: '#22c55e', label: 'SMOOTH', drivers: [], context: 'route',
};
const driveResult: DriveTripScore = {
  mode: 'drive', score,
  route: { corridorName: 'I-25', segments: [] },
  worstSegment: { lat: 39.7, lon: -104.9, score, hazard: 'No significant weather impacts' },
};
const flyResult: FlyTripScore = {
  mode: 'fly', score,
  route: {
    origin: { airport: { iata: 'DEN', city: 'Denver' }, score },
    destination: { airport: { iata: 'ATL', city: 'Atlanta' }, score },
    enroute: { midpoint: { lat: 36, lon: -90 }, score },
  },
};

type TripResponse = Pick<Response, 'ok' | 'status' | 'json'>;

function response(payload: unknown, ok = true): TripResponse {
  return { ok, status: ok ? 200 : 422, json: async () => payload };
}

function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

const originalFetch = global.fetch;
let tripFetch: jest.Mock;

beforeEach(() => {
  window.localStorage.clear();
  tripFetch = jest.fn(async () => response(driveResult));
  global.fetch = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input), 'https://www.16bitweather.co');
    if (url.pathname === '/api/travel/trip-score') return tripFetch(url, init);
    const day = Number(url.searchParams.get('day'));
    return response({
      corridors: [{ name: `Corridors day ${day}` }], worstCorridors: [],
      forecastDay: day, fetchedAt: '2026-09-26T12:00:00Z',
    });
  });
});

afterEach(() => { global.fetch = originalFetch; });

function fillTrip(): void {
  fireEvent.change(screen.getByRole('combobox', { name: 'Origin' }), { target: { value: 'DEN' } });
  fireEvent.change(screen.getByRole('combobox', { name: 'Destination' }), { target: { value: 'ATL' } });
}

describe('shared travel controls', () => {
  it('uses one mode and day choice for the trip request, result and national outlook', async () => {
    render(<TravelPage />);
    expect(screen.getAllByRole('button', { name: 'Drive' })).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: 'Fly' })).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: 'Today' })).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: 'Tomorrow' })).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Tomorrow' }));
    fillTrip();
    fireEvent.click(screen.getByRole('button', { name: 'Plan trip' }));

    await screen.findByTestId('trip-score-card');
    expect(tripFetch.mock.calls[0][0].searchParams.toString()).toBe('origin=DEN&destination=ATL&mode=drive&day=1');
    expect(within(screen.getByTestId('trip-score-card')).getByText('Drive · Tomorrow')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'WPC Day 2 Forecast Chart' })).toHaveAttribute('src', expect.stringContaining('noaad2.gif'));
    await waitFor(() => expect(screen.getByTestId('corridor-map')).toHaveTextContent('Corridors day 1'));
    expect(screen.getByText(/does not account for your departure time/)).toBeInTheDocument();
  });

  it('keeps Fly on live conditions and restores the saved mode across reloads', async () => {
    const { unmount } = render(<TravelPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Day 3' }));
    fireEvent.click(screen.getByRole('button', { name: 'Fly' }));
    expect(screen.getByRole('button', { name: 'Today' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Tomorrow' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Day 3' })).toBeDisabled();
    expect(screen.getByText(/Fly uses live airport observations/)).toBeInTheDocument();
    expect(screen.getByText('Live airport board')).toBeInTheDocument();
    expect(screen.queryByTestId('corridor-map')).not.toBeInTheDocument();
    tripFetch.mockResolvedValue(response(flyResult));
    fillTrip();
    fireEvent.click(screen.getByRole('button', { name: 'Plan trip' }));
    await screen.findByTestId('trip-score-card');
    expect(tripFetch.mock.calls[0][0].searchParams.get('day')).toBe('0');
    expect(tripFetch.mock.calls[0][0].searchParams.get('mode')).toBe('fly');
    expect(within(screen.getByTestId('trip-score-card')).getByText('Fly · Live')).toBeInTheDocument();
    unmount();
    render(<TravelPage />);
    expect(screen.getByRole('button', { name: 'Fly' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByPlaceholderText('Origin airport (e.g. ATL)')).toBeInTheDocument();
  });

  const edits = {
    mode: () => fireEvent.click(screen.getByRole('button', { name: 'Fly' })),
    day: () => fireEvent.click(screen.getByRole('button', { name: 'Tomorrow' })),
    origin: () => fireEvent.change(screen.getByRole('combobox', { name: 'Origin' }), { target: { value: 'SEA' } }),
    destination: () => fireEvent.change(screen.getByRole('combobox', { name: 'Destination' }), { target: { value: 'BOS' } }),
  };

  it.each(Object.entries(edits))('clears the previous result after editing %s', async (_name, edit) => {
    render(<TravelPage />);
    fillTrip();
    fireEvent.click(screen.getByRole('button', { name: 'Plan trip' }));
    await screen.findByTestId('trip-score-card');
    edit();
    expect(screen.queryByTestId('trip-score-card')).not.toBeInTheDocument();
  });

  it.each(Object.entries(edits))('ignores a response arriving after editing %s', async (_name, edit) => {
    const pending = deferred<TripResponse>();
    tripFetch.mockReturnValueOnce(pending.promise);
    render(<TravelPage />);
    fillTrip();
    fireEvent.click(screen.getByRole('button', { name: 'Plan trip' }));
    expect(screen.getByTestId('trip-score-card-skeleton')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Origin' })).toBeEnabled();
    edit();
    expect(tripFetch.mock.calls[0][1].signal.aborted).toBe(true);
    await act(async () => { pending.resolve(response(driveResult)); });
    expect(screen.queryByTestId('trip-score-card')).not.toBeInTheDocument();
    expect(screen.queryByTestId('trip-score-card-skeleton')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Plan trip' })).toBeEnabled();
  });

  it('ignores an old response body that finishes parsing after a day edit', async () => {
    const body = deferred<DriveTripScore>();
    const readBody = jest.fn(() => body.promise);
    tripFetch.mockResolvedValueOnce({ ok: true, status: 200, json: readBody });
    render(<TravelPage />);
    fillTrip();
    fireEvent.click(screen.getByRole('button', { name: 'Plan trip' }));
    await waitFor(() => expect(readBody).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: 'Day 3' }));
    await act(async () => { body.resolve(driveResult); });
    expect(screen.queryByTestId('trip-score-card')).not.toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'WPC Day 3 Forecast Chart' })).toBeInTheDocument();
  });

  it('allows a retry after a network error without losing the entered route', async () => {
    const log = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      tripFetch.mockRejectedValueOnce(new Error('offline'));
      render(<TravelPage />);
      fillTrip();
      fireEvent.click(screen.getByRole('button', { name: 'Plan trip' }));
      expect(await screen.findByRole('alert')).toHaveTextContent('Unable to score this trip. Please try again.');
      expect(screen.getByRole('combobox', { name: 'Origin' })).toHaveValue('DEN');
      fireEvent.click(screen.getByRole('button', { name: 'Plan trip' }));
      await screen.findByTestId('trip-score-card');
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    } finally {
      log.mockRestore();
    }
  });

  it('preserves API errors once, clears them on edit and ignores an older failure during a new request', async () => {
    tripFetch.mockResolvedValueOnce(response({ error: 'No interstate corridor connects these points' }, false));
    render(<TravelPage />);
    fillTrip();
    fireEvent.click(screen.getByRole('button', { name: 'Plan trip' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('No interstate corridor connects these points');
    expect(screen.getAllByRole('alert')).toHaveLength(1);
    fireEvent.change(screen.getByRole('combobox', { name: 'Destination' }), { target: { value: 'BOS' } });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    const oldRequest = deferred<TripResponse>();
    const newRequest = deferred<TripResponse>();
    tripFetch.mockReturnValueOnce(oldRequest.promise).mockReturnValueOnce(newRequest.promise);
    fireEvent.click(screen.getByRole('button', { name: 'Plan trip' }));
    fireEvent.change(screen.getByRole('combobox', { name: 'Destination' }), { target: { value: 'SEA' } });
    fireEvent.click(screen.getByRole('button', { name: 'Plan trip' }));
    await act(async () => { oldRequest.resolve(response({ error: 'Old route error' }, false)); });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByTestId('trip-score-card-skeleton')).toBeInTheDocument();
    await act(async () => { newRequest.resolve(response(driveResult)); });
    expect(screen.getByTestId('trip-score-card')).toBeInTheDocument();
  });
});
