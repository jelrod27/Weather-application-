'use client';

import { useEffect, useState } from 'react';

type SupplementResult<T> =
  | { status: 'loading' }
  | { status: 'ready'; items: T[] }
  | { status: 'unavailable' };

export function useStargazerSupplement<T>(url: string): { result: SupplementResult<T>; retry: () => void } {
  const [result, setResult] = useState<SupplementResult<T>>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    async function load(): Promise<void> {
      try {
        const response = await fetch(url, {
          signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]),
        });
        if (!response.ok) throw new Error('Supplement unavailable');
        const items = await response.json();
        if (!Array.isArray(items)) throw new Error('Unexpected supplement response');
        if (!controller.signal.aborted) setResult({ status: 'ready', items });
      } catch {
        if (!controller.signal.aborted) setResult({ status: 'unavailable' });
      }
    }
    void load();
    return () => controller.abort();
  }, [url, attempt]);

  function retry(): void {
    setResult({ status: 'loading' });
    setAttempt(attempt => attempt + 1);
  }

  return { result, retry };
}
