import { act, render, screen, renderHook, waitFor } from '@testing-library/react';
import StargazerCommandCenter from '@/components/stargazer/StargazerCommandCenter';
import { StrictMode } from 'react';
import { useStargazerController } from '@/hooks/useStargazerController';
import { stargazerE2eFixture } from '@/tests/fixtures/stargazer-e2e-fixture';

jest.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams(window.location.search) }));
jest.mock('@/lib/auth', () => ({ useAuth: () => ({ preferences: null }) }));
let storedPlace = '';
jest.mock('@/components/location-context', () => ({
  useLocationContext: () => ({ currentLocation: storedPlace, locationInput: '' }),
}));

const response = (body: unknown, ok = true): Response => ({ ok, json: async () => body }) as Response;
const event = { preventDefault: () => {} } as React.FormEvent;

beforeEach(() => {
  storedPlace = '';
  window.history.replaceState(null, '', '/stargazer');
  global.fetch = jest.fn(async (input) => {
    const url = new URL(String(input), 'http://localhost');
    if (url.pathname.includes('geocoding')) {
      return response(url.searchParams.get('q') === 'London' ? [{ lat: 51.5, lon: -0.12 }] : []);
    }
    return response({ ...stargazerE2eFixture(), location: {
      lat: Number(url.searchParams.get('lat')), lon: Number(url.searchParams.get('lon')),
      displayName: 'London', timezone: 'Europe/London',
    } });
  });
});

it('resolves the explicitly linked city before a stored city', async () => {
  storedPlace = 'New York';
  window.history.replaceState(null, '', '/stargazer?q=London');
  const { result } = renderHook(() => useStargazerController());
  await waitFor(() => expect(result.current.data?.location.lat).toBe(51.5));
  expect(result.current.error).toBeNull();
});

it('offers location selection without silently loading a default city', async () => {
  const { result } = renderHook(() => useStargazerController());
  await waitFor(() => expect(result.current.isLoading).toBe(false));
  expect(result.current.data).toBeNull();
});

it('persists a successful search and clears old recommendations on a failed search', async () => {
  const { result } = renderHook(() => useStargazerController());
  act(() => result.current.setSearchQuery('London'));
  await act(async () => result.current.handleLocationSearch(event));
  expect(result.current.data?.location.lat).toBe(51.5);
  expect(new URLSearchParams(window.location.search).get('lat')).toBe('51.5');
  act(() => result.current.setSearchQuery('No such place'));
  await act(async () => result.current.handleLocationSearch(event));
  expect(result.current.data).toBeNull();
  expect(result.current.error).toMatch(/not found/i);
});

it('rejects a malformed coordinate link without showing a different city', async () => {
  window.history.replaceState(null, '', '/stargazer?lat=51garbage&lon=0');
  const { result } = renderHook(() => useStargazerController());
  await waitFor(() => expect(result.current.isLoading).toBe(false));
  expect(result.current.data).toBeNull();
  expect(result.current.error).toMatch(/coordinates/i);
});

it('finishes loading after Strict Mode remounts its effects', async () => {
  window.history.replaceState(null, '', '/stargazer?lat=51.5&lon=-0.12');
  const { result } = renderHook(() => useStargazerController(), { wrapper: StrictMode });
  await waitFor(() => expect(result.current.data?.location.lat).toBe(51.5));
});

it.each([false, true])('retries the failed search instead of the previous URL (previous place: %s)', async (previous) => {
  if (previous) window.history.replaceState(null, '', '/stargazer?lat=40&lon=-74&q=New+York');
  let fail = true;
  const realFetch = global.fetch;
  global.fetch = jest.fn(async (input, init) => {
    if (String(input).includes('/api/stargazer?lat=51.5') && fail) return response({}, false);
    return realFetch(input, init);
  });
  const { result } = renderHook(() => useStargazerController());
  await waitFor(() => expect(result.current.isLoading).toBe(false));
  act(() => result.current.setSearchQuery('London'));
  await act(async () => result.current.handleLocationSearch(event));
  expect(result.current.error).not.toBeNull();
  fail = false;
  const historySize = window.history.length;
  await act(async () => result.current.refresh());
  expect(result.current.data?.location.lat).toBe(51.5);
  expect(window.history.length).toBe(historySize + 1);
});

it('ignores an older geocode after the user navigates to another city', async () => {
  let finish: (value: Response) => void = () => {};
  const realFetch = global.fetch;
  global.fetch = jest.fn((input, init) => String(input).includes('geocoding')
    ? new Promise(resolve => { finish = resolve; }) : realFetch(input, init));
  window.history.replaceState(null, '', '/stargazer?q=London');
  const { result, rerender } = renderHook(() => useStargazerController());
  window.history.replaceState(null, '', '/stargazer?lat=-33.87&lon=151.21');
  rerender();
  await waitFor(() => expect(result.current.data?.location.lat).toBe(-33.87));
  await act(async () => finish(response([{ lat: 51.5, lon: -0.12 }])));
  expect(result.current.data?.location.lat).toBe(-33.87);
});

it.each([true, false])('ignores superseded forecast completion (success: %s)', async (ok) => {
  let finish: (value: Response) => void = () => {};
  const realFetch = global.fetch;
  global.fetch = jest.fn((input, init) => String(input).includes('lat=40&')
    ? new Promise(resolve => { finish = resolve; }) : realFetch(input, init));
  window.history.replaceState(null, '', '/stargazer?lat=40&lon=-74');
  const { result, rerender } = renderHook(() => useStargazerController());
  window.history.replaceState(null, '', '/stargazer?lat=51.5&lon=-0.12');
  rerender();
  await waitFor(() => expect(result.current.data?.location.lat).toBe(51.5));
  await act(async () => finish(response(stargazerE2eFixture(), ok)));
  expect(result.current.data?.location.lat).toBe(51.5);
  expect(result.current.error).toBeNull();
});

it('keeps device denial recoverable without a default-city forecast', async () => {
  Object.defineProperty(navigator, 'geolocation', { configurable: true, value: {
    getCurrentPosition: (_success: PositionCallback, error: PositionErrorCallback) => error({ code: 1, message: 'denied', PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 }),
  } });
  const { result } = renderHook(() => useStargazerController());
  await act(async () => result.current.handleDeviceLocation());
  expect(result.current.data).toBeNull();
  expect(result.current.error).toMatch(/search for a city/i);
});
it.each(['start', 'conditions', 'targets', 'events', 'launches'])('preserves the #%s entry panel', async tab => {
  window.history.replaceState(null, '', `/stargazer#${tab}`);
  const { result } = renderHook(() => useStargazerController());
  await waitFor(() => expect(result.current.activeTab).toBe(tab));
});
it('defaults unqualified visits to Start here', async () => {
  const { result } = renderHook(() => useStargazerController());
  await waitFor(() => expect(result.current.isLoading).toBe(false));
  expect(result.current.activeTab).toBe('start');
});
it('changes tabs through history without losing the observing context and handles Back', async () => {
  window.history.replaceState(null, '', '/stargazer?q=London&equipment=binoculars');
  const { result } = renderHook(() => useStargazerController());
  await waitFor(() => expect(result.current.isLoading).toBe(false));
  const query = window.location.search;
  act(() => result.current.handleTabChange('conditions'));
  expect(result.current.activeTab).toBe('conditions');
  expect(window.location.search).toBe(query);
  expect(window.location.hash).toBe('#conditions');
  act(() => { window.history.replaceState(null, '', `${window.location.pathname}${query}#start`); window.dispatchEvent(new PopStateEvent('popstate')); });
  expect(result.current.activeTab).toBe('start');
});

it('keeps a malformed shared-hour explanation after location canonicalization', async () => {
  window.history.replaceState(null, '', '/stargazer?lat=51.5&lon=-0.12&at=bad');
  const realFetch = global.fetch;
  global.fetch = jest.fn(async (input, init) => {
    const res = await realFetch(input, init);
    const body = await res.json();
    const start = Date.now() + 3600000;
    return response({ ...body, beginnerNight: { hours: [{ start, end: start + 3600000, midpoint: start + 1800000,
      weather: { cloudLow: 0, cloudHigh: 10, temperatureLow: 10, temperatureHigh: 12, wind: 5, precipitation: 0, issues: [] }, targets: [],
    }] } });
  });
  render(<StargazerCommandCenter />);
  expect(await screen.findByText(/shared hour.*replaced/i)).toBeInTheDocument();
  expect(new URLSearchParams(window.location.search).get('at')).not.toBe('bad');
});
