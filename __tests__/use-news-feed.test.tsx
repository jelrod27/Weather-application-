import { act, renderHook } from '@testing-library/react';
import { useNewsFeed } from '@/hooks/use-news-feed';
import { NEWS_EPOCH, newsTime, newsBrowse, newsItem } from '../tests/fixtures/news-reading';
import type { NewsBrowseResult } from '@/lib/news/sections';

function response(data = newsBrowse()): Response {
  return { ok: true, json: async () => ({ status: 'ok', ...data }) } as Response;
}

function visibility(value: 'hidden' | 'visible'): void {
  Object.defineProperty(document, 'visibilityState', { configurable: true, value });
  document.dispatchEvent(new Event('visibilitychange'));
}

async function tick(ms = 0): Promise<void> {
  await act(async () => { await jest.advanceTimersByTimeAsync(ms); });
}

describe('visible-page news refresh', () => {
  let fetcher: jest.Mock;
  const originalFetch = globalThis.fetch;
  beforeEach(() => {
    jest.useFakeTimers({ now: NEWS_EPOCH });
    visibility('visible');
    fetcher = jest.fn().mockResolvedValue(response());
    globalThis.fetch = fetcher;
  });
  afterEach(() => { jest.useRealTimers(); globalThis.fetch = originalFetch; });

  it('stages background updates while preserving filters and visible reading, then applies on request', async () => {
    const { result } = renderHook(() => useNewsFeed({ category: 'science', query: 'cloud' }, jest.fn()));
    await tick();
    const latest = newsBrowse([newsItem({ id: 'new-story' })]);
    fetcher.mockResolvedValue(response(latest));
    await tick(120_000);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher.mock.calls[1][0]).toContain('categories=science&q=cloud');
    expect(result.current.displayed?.sections.find(section => section.id === 'reading')?.items[0].id).toBe('reading-1');
    expect(result.current.pending).not.toBeNull();
    act(() => result.current.applyPending());
    expect(result.current.displayed?.sections.find(section => section.id === 'reading')?.items[0].id).toBe('new-story');
    expect(result.current.pending).toBeNull();
  });

  it('pauses hidden checks and ages, checks once on overdue return, and retires expired warnings immediately', async () => {
    const { result } = renderHook(() => useNewsFeed({ category: 'all' }, jest.fn()));
    await tick();
    act(() => visibility('hidden'));
    await tick(600_000);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(result.current.now).toBe(NEWS_EPOCH);
    act(() => visibility('visible'));
    await tick();
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(result.current.displayed?.sections.find(section => section.id === 'active')?.items).toEqual([]);
    expect(result.current.displayed?.sources[0].lastSuccessAt).toBe(newsTime(0));
  });

  it('meets an expiry deadline between requests and keeps relative ages ticking', async () => {
    const data = newsBrowse();
    data.sections[0].items[0].warning!.expires = newsTime(37_000);
    fetcher.mockResolvedValue(response(data));
    const { result } = renderHook(() => useNewsFeed({ category: 'all' }, jest.fn()));
    await tick(36_999);
    expect(result.current.displayed?.sections[0].items).toHaveLength(1);
    await tick(1);
    expect(result.current.displayed?.sections[0].items).toHaveLength(0);
    expect(result.current.now).toBe(NEWS_EPOCH + 37_000);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('demotes cancelled visible warnings on a background check before the reader applies new cards', async () => {
    const { result } = renderHook(() => useNewsFeed({ category: 'all' }, jest.fn()));
    await tick();
    fetcher.mockResolvedValue(response(newsBrowse([newsItem()])));
    await tick(120_000);
    expect(result.current.displayed?.sections[0].items).toHaveLength(0);
    expect(result.current.pending).not.toBeNull();
  });

  it('retains delayed content on failure and backs off before an explicit recovery', async () => {
    const { result } = renderHook(() => useNewsFeed({ category: 'all' }, jest.fn()));
    await tick();
    fetcher.mockRejectedValue(new Error('offline'));
    await tick(120_000);
    expect(result.current.error).toMatch(/Refresh failed/);
    expect(result.current.displayed?.sections.find(section => section.id === 'delayed')?.items).toHaveLength(2);
    await tick(239_999);
    expect(fetcher).toHaveBeenCalledTimes(2);
    await tick(1);
    expect(fetcher).toHaveBeenCalledTimes(3);
    await tick(479_999);
    expect(fetcher).toHaveBeenCalledTimes(3);
    fetcher.mockResolvedValue(response(newsBrowse([newsItem()])));
    act(() => result.current.refresh());
    await tick();
    expect(result.current.error).toBeNull();
    expect(result.current.pending).toBeNull();
    expect(result.current.displayed?.sections.find(section => section.id === 'reading')?.items).toHaveLength(1);
  });

  it('does not overlap a slow request and ignores an old query response after abort', async () => {
    let resolveOld!: (value: Response) => void;
    fetcher.mockImplementationOnce(() => new Promise<Response>(resolve => { resolveOld = resolve; }));
    const { result, rerender } = renderHook(({ query }) => useNewsFeed({ category: 'all', query }, jest.fn()), { initialProps: { query: 'old' } });
    await tick(20_000);
    act(() => result.current.refresh());
    expect(fetcher).toHaveBeenCalledTimes(1);
    const signal: AbortSignal = fetcher.mock.calls[0][1].signal;
    rerender({ query: 'new' });
    await tick();
    expect(signal.aborted).toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(2);
    await act(async () => { resolveOld(response(newsBrowse([newsItem({ id: 'outdated' })]))); });
    expect(result.current.displayed?.sections.find(section => section.id === 'reading')?.items[0].id).toBe('reading-1');
  });

  it('aborts a hidden in-flight request and resumes once without a retry storm', async () => {
    fetcher.mockImplementationOnce((_url, init: RequestInit) => new Promise((_resolve, reject) => {
      init.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
    }));
    const { result } = renderHook(() => useNewsFeed({ category: 'all' }, jest.fn()));
    act(() => visibility('hidden'));
    await tick(600_000);
    expect(fetcher).toHaveBeenCalledTimes(1);
    act(() => visibility('visible'));
    await tick();
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(result.current.error).toBeNull();
  });

  it('times out a hung request and waits four minutes before retrying', async () => {
    fetcher.mockImplementation((_url, init: RequestInit) => new Promise<NewsBrowseResult>((_resolve, reject) => {
      init.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
    }));
    const { result } = renderHook(() => useNewsFeed({ category: 'all' }, jest.fn()));
    await tick(45_000);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).not.toBeNull();
    await tick(239_999);
    expect(fetcher).toHaveBeenCalledTimes(1);
    await tick(1);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('retains the reader copy when an explicit refresh returns unavailable sources from a cold server', async () => {
    const { result } = renderHook(() => useNewsFeed({ category: 'all' }, jest.fn()));
    await tick();
    const cold = newsBrowse([]);
    cold.sources = cold.sources.map(source => ({ ...source, state: 'unavailable', lastSuccessAt: null, freshUntil: null, retainedUntil: null }));
    fetcher.mockResolvedValue(response(cold));
    act(() => result.current.refresh());
    await tick();
    expect(result.current.displayed?.sections.find(section => section.id === 'delayed')?.items).toHaveLength(2);
    expect(result.current.displayed?.sources[0]).toMatchObject({ state: 'delayed', lastSuccessAt: newsTime(0) });
  });
});
