'use client'

import { useCallback, useEffect, useState } from 'react'

interface WinterResourceState<T> {
  url: string | null
  data: T | null
  loading: boolean
  error: string | null
}

/** Retain data only for the exact same query; obsolete requests cannot win a race. */
export function useWinterResource<T>(url: string | null): Omit<WinterResourceState<T>, 'url'> & { refresh: () => void } {
  const [state, setState] = useState<WinterResourceState<T>>({ url: null, data: null, loading: false, error: null })
  const [revision, setRevision] = useState(0)
  const refresh = useCallback(() => setRevision(value => value + 1), [])

  useEffect(() => {
    if (!url) return
    let active = true
    let controller: AbortController | null = null
    let timeout: ReturnType<typeof setTimeout> | null = null
    async function load(): Promise<void> {
      controller?.abort()
      if (timeout) clearTimeout(timeout)
      const request = new AbortController()
      controller = request
      setState(previous => ({ url, data: previous.url === url ? previous.data : null, loading: true, error: previous.url === url ? previous.error : null }))
      timeout = setTimeout(() => request.abort(), 40_000)
      try {
        const response = await fetch(url!, { signal: request.signal, cache: 'no-store' })
        if (!response.ok) throw new Error('Source request failed')
        const data = await response.json() as T
        if (active && controller === request && !request.signal.aborted) setState({ url, data, loading: false, error: null })
      } catch {
        if (active && controller === request) setState(previous => ({ url, data: previous.url === url ? previous.data : null, loading: false, error: 'Source unavailable. Please try again.' }))
      } finally {
        if (controller === request && timeout) clearTimeout(timeout)
      }
    }
    void load()
    const interval = setInterval(() => { if (document.visibilityState !== 'hidden') void load() }, 300_000)
    return () => { active = false; controller?.abort(); if (timeout) clearTimeout(timeout); clearInterval(interval) }
  }, [url, revision])

  if (state.url !== url) return { data: null, loading: url !== null, error: null, refresh }
  return { data: state.data, loading: state.loading, error: state.error, refresh }
}
