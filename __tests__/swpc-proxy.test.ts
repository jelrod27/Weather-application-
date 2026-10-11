/**
 * Unit tests for the NOAA SWPC proxy helpers.
 */

import { fetchSwpc, fetchSwpcJson } from '@/lib/services/swpc-proxy';

describe('swpc-proxy', () => {
  const realFetch = global.fetch;
  afterEach(() => {
    global.fetch = realFetch;
    jest.clearAllMocks();
  });

  it('fetchSwpcJson parses JSON and sends Accept + User-Agent', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ hello: 'world' }),
    });
    global.fetch = mockFetch as unknown as typeof fetch;

    const data = await fetchSwpcJson<{ hello: string }>('https://services.swpc.noaa.gov/x.json');
    expect(data).toEqual({ hello: 'world' });

    const headers = (mockFetch.mock.calls[0][1] as RequestInit).headers as Headers;
    expect(headers.get('User-Agent')).toBe('16BitWeather/1.0');
    expect(headers.get('Accept')).toBe('application/json');
  });

  it('fetchSwpcJson throws on a non-OK status', async () => {
    // 404 is not in the retryable set, so fetchWithTimeout returns it immediately.
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 404 }) as unknown as typeof fetch;
    await expect(fetchSwpcJson('https://services.swpc.noaa.gov/missing.json')).rejects.toThrow('404');
  });

  it('retries malformed cached JSON once without the persistent cache', async () => {
    const mockFetch = jest.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => { throw new SyntaxError('Unexpected end of JSON input'); } })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ healthy: true }) });
    global.fetch = mockFetch as unknown as typeof fetch;

    await expect(fetchSwpcJson<{ healthy: boolean }>('https://services.swpc.noaa.gov/x.json', {
      next: { revalidate: 300 },
    })).resolves.toEqual({ healthy: true });

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(mockFetch.mock.calls[0][1]).toEqual(expect.objectContaining({ next: { revalidate: 300 } }));
    expect(mockFetch.mock.calls[1][1]).toEqual(expect.objectContaining({ cache: 'no-store' }));
    expect(mockFetch.mock.calls[1][1]).not.toHaveProperty('next');
  });

  it('does not retry a second malformed response', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => { throw new SyntaxError('Unexpected end of JSON input'); },
    });
    global.fetch = mockFetch as unknown as typeof fetch;

    await expect(fetchSwpcJson('https://services.swpc.noaa.gov/x.json')).rejects.toThrow();
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('fetchSwpc returns the Response without throwing on a non-OK status', async () => {
    const res = { ok: false, status: 500, text: async () => 'oops' };
    global.fetch = jest.fn().mockResolvedValue(res) as unknown as typeof fetch;
    const out = await fetchSwpc('https://services.swpc.noaa.gov/dir/');
    expect(out.ok).toBe(false);
    expect(out.status).toBe(500);
  });

  it('lets caller headers override the defaults', async () => {
    const mockFetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => [] });
    global.fetch = mockFetch as unknown as typeof fetch;
    await fetchSwpcJson('https://services.swpc.noaa.gov/x.json', { headers: { 'User-Agent': 'custom' } });
    const headers = (mockFetch.mock.calls[0][1] as RequestInit).headers as Headers;
    expect(headers.get('User-Agent')).toBe('custom');
  });
});
