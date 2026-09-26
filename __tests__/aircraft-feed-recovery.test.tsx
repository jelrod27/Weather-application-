import { act, renderHook, waitFor } from '@testing-library/react';
import { useLiveAircraftPoll } from '@/hooks/useLiveAircraftPoll';
import { fetchWithTimeout } from '@/lib/fetch-with-timeout';
import { aircraftFeedLabel } from '@/lib/aviation/aircraft-feed-status';
import type { Aircraft } from '@/lib/aviation/aircraft-types';

jest.mock('@/lib/fetch-with-timeout');
const fetchMock = jest.mocked(fetchWithTimeout);
const aircraft = { icao24: 'abc123', lat: 39, lon: -100, callsign: 'TEST', trackDeg: 0 } as Aircraft;
function setup(): { args: Parameters<typeof useLiveAircraftPoll>[0]; setData: jest.Mock; events: Record<string, () => void> } {
  const setData = jest.fn();
  const events: Record<string, () => void> = {};
  const map = { getCenter: () => ({ lat: 39, lng: -100 }), getZoom: () => 6, getLayer: () => null, getSource: () => ({ setData }), on: (name: string, fn: () => void) => { events[name] = fn; }, off: jest.fn() };
  return { setData, events, args: {
    mapRef: { current: map as unknown as Parameters<typeof useLiveAircraftPoll>[0]['mapRef']['current'] }, mapReady: true,
    aircraftByIdRef: { current: new Map() }, selectedRef: { current: null }, highlightRef: { current: null },
    visibleRef: { current: true }, fetchingRef: { current: false }, onStatusRef: { current: jest.fn() }, onSelectedUpdateRef: { current: jest.fn() },
  } };
}
const response = (list: Aircraft[], degraded = false) => ({ ok: true, json: async () => ({ aircraft: list, source: degraded ? 'adsb.fi' : 'adsb.lol', degraded, fetchedAt: 1790337600000 }) }) as Response;
let consoleError: jest.SpyInstance;
beforeEach(() => { fetchMock.mockReset(); consoleError = jest.spyOn(console, 'error').mockImplementation(() => {}); });
afterEach(() => consoleError.mockRestore());

describe('Aircraft feed recovery', () => {
  it('does not claim cleared positions are visible while updating after a map move', async () => {
    fetchMock.mockResolvedValueOnce(response([aircraft]));
    const { args, events, setData } = setup();
    const { result } = renderHook(() => useLiveAircraftPoll(args));
    await waitFor(() => expect(result.current.status.state).toBe('ready'));
    act(() => events.movestart());
    expect(setData).toHaveBeenLastCalledWith({ type: 'FeatureCollection', features: [] });
    expect(aircraftFeedLabel(result.current.status)).toBe('Updating aircraft traffic…');
  });
  it('distinguishes backup-feed emptiness from failure, keeps the last update, and retries', async () => {
    fetchMock.mockResolvedValueOnce(response([aircraft]));
    const { args, setData } = setup();
    const { result } = renderHook(() => useLiveAircraftPoll(args));
    await waitFor(() => expect(result.current.status.state).toBe('ready'));
    expect(result.current.status.count).toBe(1);
    fetchMock.mockResolvedValueOnce({ ok: false, json: async () => ({ aircraft: [], count: 0, degraded: true }) } as Response);
    await act(async () => result.current.retry());
    expect(aircraftFeedLabel(result.current.status)).toBe('Aircraft traffic unavailable');
    expect(result.current.status.count).toBeNull();
    expect(result.current.status.updatedAt).toBe(1790337600000);
    expect(setData).toHaveBeenLastCalledWith({ type: 'FeatureCollection', features: [] });
    fetchMock.mockResolvedValueOnce(response([], true));
    await act(async () => result.current.retry());
    expect(aircraftFeedLabel(result.current.status)).toBe('Backup feed · adsb.fi · No aircraft returned in this area');
  });
  it('discards the previous area response after a map move', async () => {
    let finish!: (response: Response) => void;
    fetchMock.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    const { args, events, setData } = setup();
    const { result } = renderHook(() => useLiveAircraftPoll(args));
    act(() => events.movestart());
    fetchMock.mockResolvedValueOnce(response([]));
    await act(async () => result.current.retry());
    await act(async () => finish(response([aircraft])));
    expect(result.current.status.count).toBe(0);
    expect(setData).toHaveBeenLastCalledWith({ type: 'FeatureCollection', features: [] });
  });
  it('does not apply a response after unmount and clears the in-flight flag', async () => {
    let finish!: (response: Response) => void;
    fetchMock.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    const { args, setData } = setup();
    const { unmount } = renderHook(() => useLiveAircraftPoll(args));
    unmount();
    const before = setData.mock.calls.length;
    await act(async () => finish(response([aircraft])));
    expect(setData).toHaveBeenCalledTimes(before);
    expect(args.fetchingRef.current).toBe(false);
  });
  it('turns a timed-out request into a recoverable unavailable state', async () => {
    fetchMock.mockRejectedValueOnce(new Error('request timed out'));
    const { args } = setup();
    const { result } = renderHook(() => useLiveAircraftPoll(args));
    await waitFor(() => expect(result.current.status.state).toBe('unavailable'));
    expect(result.current.status.updatedAt).toBeNull();
    fetchMock.mockResolvedValueOnce(response([aircraft]));
    await act(async () => result.current.retry());
    expect(result.current.status.state).toBe('ready');
  });
});
