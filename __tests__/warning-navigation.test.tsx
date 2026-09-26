import { act, renderHook, waitFor } from '@testing-library/react';
import { getOfficialWarningHref, getWarningRadarHref, radarWarningReturnHref, warningReturnHref } from '@/lib/warnings/alert-links';
import { useRadarWarning } from '@/hooks/useRadarWarning';
import { fetchWithTimeout } from '@/lib/fetch-with-timeout';
import type { NWSAlertDetail } from '@/lib/services/nws-alerts-service';

jest.mock('@/lib/fetch-with-timeout');
const fetchMock = jest.mocked(fetchWithTimeout);
const warning = {
  id: 'https://api.weather.gov/alerts/urn:oid:test-warning',
  expires: new Date(Date.now() + 120_000).toISOString(),
  geometry: { type: 'Polygon', coordinates: [[[-100, 35], [-98, 35], [-98, 37], [-100, 35]]] },
} as NWSAlertDetail;
const response = (alerts: NWSAlertDetail[]) => ({ ok: true, json: async () => ({ alerts }) }) as Response;

describe('Warning navigation and lifecycle', () => {
  it('carries the warning, bounds, and desk filters through the radar round trip', () => {
    const desk = '/warnings?state=TX&event=Tornado+Warning&search=Austin&alert=urn%3Aoid%3Atest-warning';
    const radar = new URL(getWarningRadarHref(warning, desk), 'https://www.16bitweather.co');
    expect(radar.searchParams.get('lat')).toBe('36.0000');
    expect(radar.searchParams.get('lon')).toBe('-99.0000');
    expect(radar.searchParams.get('warning')).toBe('urn:oid:test-warning');
    const back = radarWarningReturnHref(warning.id, radar.searchParams.get('returnTo'));
    expect(new URL(back, radar.origin).searchParams.get('returnTo')).toBe(desk);
    expect(getOfficialWarningHref(warning.id)).toBe('https://api.weather.gov/alerts/urn%3Aoid%3Atest-warning');
  });
  it.each(['https://evil.example', '//evil.example', '/warnings/other', 'javascript:alert(1)'])('rejects unsafe return %s', (href) => {
    expect(warningReturnHref(href)).toBe('/warnings');
    expect(radarWarningReturnHref(warning.id, href)).toBe('/warnings/urn%3Aoid%3Atest-warning');
  });
  it('recovers a failed warning load and reports missing geometry and expired selections', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false } as Response).mockResolvedValueOnce(response([warning]));
    const { result } = renderHook(() => useRadarWarning('urn:oid:test-warning'));
    await waitFor(() => expect(result.current.error).toMatch(/unavailable/));
    act(() => result.current.retry());
    await waitFor(() => expect(result.current.warning?.id).toBe(warning.id));
    expect(result.current.error).toBeNull();
    fetchMock.mockResolvedValueOnce(response([{ ...warning, geometry: null }]));
    act(() => result.current.retry());
    await waitFor(() => expect(result.current.error).toMatch(/not provided a polygon/));
    fetchMock.mockResolvedValueOnce(response([]));
    act(() => result.current.retry());
    await waitFor(() => expect(result.current.error).toMatch(/no longer in the active feed/));
  });

  it('removes a warning at expiry and revalidates against cancellation updates', async () => {
    jest.useFakeTimers();
    try {
      const expiring = { ...warning, expires: new Date(Date.now() + 5000).toISOString() };
      fetchMock.mockResolvedValueOnce(response([expiring]));
      const { result, unmount } = renderHook(() => useRadarWarning('urn:oid:test-warning'));
      await act(async () => { await Promise.resolve(); });
      expect(result.current.warning).toEqual(expiring);
      act(() => jest.advanceTimersByTime(5000));
      expect(result.current.warning).toBeNull();
      fetchMock.mockResolvedValueOnce(response([{ ...warning, expires: new Date(Date.now() + 120000).toISOString() }]));
      act(() => result.current.retry());
      await act(async () => { await Promise.resolve(); });
      expect(result.current.warning).not.toBeNull();
      fetchMock.mockResolvedValueOnce(response([]));
      await act(async () => jest.advanceTimersByTime(60000));
      expect(result.current.warning).toBeNull();
      expect(result.current.error).toMatch(/no longer/);
      unmount();
    } finally { jest.useRealTimers(); }
  });
});
