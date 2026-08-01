import { act, renderHook, waitFor } from '@testing-library/react'
import { useRemoteData } from '@/hooks/useRemoteData'

/**
 * The race these assertions exist for: 20 of the 31 hand-rolled fetch triads had
 * no AbortController, so a slow first response could land after a fast second
 * one and overwrite it.
 */
function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe('useRemoteData', () => {
  it('loads data for a key and reports loading state around it', async () => {
    const d = deferred<string>()
    const { result } = renderHook(() =>
      useRemoteData<string>({ key: 'a', fetcher: () => d.promise }),
    )

    expect(result.current.isLoading).toBe(true)
    expect(result.current.data).toBeNull()

    await act(async () => {
      d.resolve('value')
    })

    expect(result.current.data).toBe('value')
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeNull()
    expect(result.current.updatedAt).toEqual(expect.any(Number))
  })

  it('ignores a stale response that resolves after a newer key started', async () => {
    const first = deferred<string>()
    const second = deferred<string>()
    const fetcher = jest
      .fn<Promise<string>, [AbortSignal]>()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise)

    const { result, rerender } = renderHook(
      ({ k }: { k: string }) => useRemoteData<string>({ key: k, fetcher }),
      { initialProps: { k: 'a' } },
    )

    rerender({ k: 'b' })

    // The newer key resolves first, then the abandoned one arrives late.
    await act(async () => {
      second.resolve('second')
    })
    expect(result.current.data).toBe('second')

    await act(async () => {
      first.resolve('first')
    })

    // Without the load-id guard, 'first' would clobber 'second' here.
    expect(result.current.data).toBe('second')
  })

  it('aborts the in-flight request when the key changes', async () => {
    const signals: AbortSignal[] = []
    const fetcher = jest.fn((signal: AbortSignal) => {
      signals.push(signal)
      return new Promise<string>(() => {})
    })

    const { rerender } = renderHook(
      ({ k }: { k: string }) => useRemoteData<string>({ key: k, fetcher }),
      { initialProps: { k: 'a' } },
    )

    expect(signals[0].aborted).toBe(false)
    rerender({ k: 'b' })
    expect(signals[0].aborted).toBe(true)
  })

  it('aborts on unmount', () => {
    const signals: AbortSignal[] = []
    const { unmount } = renderHook(() =>
      useRemoteData<string>({
        key: 'a',
        fetcher: (signal) => {
          signals.push(signal)
          return new Promise<string>(() => {})
        },
      }),
    )

    unmount()
    expect(signals[0].aborted).toBe(true)
  })

  it('does not load and clears state when the key is null', async () => {
    const fetcher = jest.fn()
    const { result } = renderHook(() =>
      useRemoteData<string>({ key: null, fetcher }),
    )

    expect(fetcher).not.toHaveBeenCalled()
    expect(result.current.data).toBeNull()
    expect(result.current.isLoading).toBe(false)
  })

  it('surfaces an error and stops loading', async () => {
    const { result } = renderHook(() =>
      useRemoteData<string>({
        key: 'a',
        fetcher: async () => {
          throw new Error('upstream down')
        },
      }),
    )

    await waitFor(() => expect(result.current.error).toBeInstanceOf(Error))
    expect(result.current.error?.message).toBe('upstream down')
    expect(result.current.isLoading).toBe(false)
    expect(result.current.data).toBeNull()
  })

  it('retries the configured number of times before giving up', async () => {
    const fetcher = jest.fn(async () => {
      throw new Error('flaky')
    })

    const { result } = renderHook(() =>
      useRemoteData<string>({ key: 'a', fetcher, retry: 2, retryDelayMs: 1 }),
    )

    await waitFor(() => expect(result.current.error).toBeInstanceOf(Error))
    expect(fetcher).toHaveBeenCalledTimes(3)
  })

  it('recovers when a retry succeeds', async () => {
    const fetcher = jest
      .fn<Promise<string>, [AbortSignal]>()
      .mockRejectedValueOnce(new Error('flaky'))
      .mockResolvedValueOnce('recovered')

    const { result } = renderHook(() =>
      useRemoteData<string>({ key: 'a', fetcher, retry: 1, retryDelayMs: 1 }),
    )

    await waitFor(() => expect(result.current.data).toBe('recovered'))
    expect(result.current.error).toBeNull()
  })

  it('clears previous data on key change by default', async () => {
    const fetcher = jest
      .fn<Promise<string>, [AbortSignal]>()
      .mockResolvedValueOnce('first')
      .mockReturnValueOnce(new Promise<string>(() => {}))

    const { result, rerender } = renderHook(
      ({ k }: { k: string }) => useRemoteData<string>({ key: k, fetcher }),
      { initialProps: { k: 'a' } },
    )

    await waitFor(() => expect(result.current.data).toBe('first'))
    act(() => {
      rerender({ k: 'b' })
    })
    expect(result.current.data).toBeNull()
  })

  it('keeps previous data across a key change when asked', async () => {
    const fetcher = jest
      .fn<Promise<string>, [AbortSignal]>()
      .mockResolvedValueOnce('first')
      .mockReturnValueOnce(new Promise<string>(() => {}))

    const { result, rerender } = renderHook(
      ({ k }: { k: string }) =>
        useRemoteData<string>({ key: k, fetcher, keepPreviousData: true }),
      { initialProps: { k: 'a' } },
    )

    await waitFor(() => expect(result.current.data).toBe('first'))
    act(() => {
      rerender({ k: 'b' })
    })
    expect(result.current.data).toBe('first')
  })

  it('serves a cached value for the same key without calling the fetcher again', async () => {
    const fetcher = jest.fn(async () => 'cached-value')
    const ttl = 60_000

    const first = renderHook(() =>
      useRemoteData<string>({ key: 'shared-key', fetcher, cacheTtlMs: ttl }),
    )
    await waitFor(() => expect(first.result.current.data).toBe('cached-value'))
    first.unmount()

    const second = renderHook(() =>
      useRemoteData<string>({ key: 'shared-key', fetcher, cacheTtlMs: ttl }),
    )

    expect(second.result.current.data).toBe('cached-value')
    expect(second.result.current.isLoading).toBe(false)
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('refresh() reloads past the cache', async () => {
    const fetcher = jest
      .fn<Promise<string>, [AbortSignal]>()
      .mockResolvedValueOnce('one')
      .mockResolvedValueOnce('two')

    const { result } = renderHook(() =>
      useRemoteData<string>({ key: 'refresh-key', fetcher, cacheTtlMs: 60_000 }),
    )

    await waitFor(() => expect(result.current.data).toBe('one'))

    act(() => {
      result.current.refresh()
    })

    await waitFor(() => expect(result.current.data).toBe('two'))
    expect(fetcher).toHaveBeenCalledTimes(2)
  })
})
