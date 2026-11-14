'use client'

import { useEffect, useRef, useState } from 'react'
import type { FormEvent, ReactElement } from 'react'
import type { WinterPlace } from '@/lib/winter/types'
import type { GeocodingResponse } from '@/lib/weather'

interface WinterPlaceSearchProps {
  onSelect: (place: WinterPlace) => void
}

export default function WinterPlaceSearch({ onSelect }: WinterPlaceSearchProps): ReactElement {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<GeocodingResponse[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const request = useRef<AbortController | null>(null)
  useEffect(() => () => request.current?.abort(), [])

  async function search(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    request.current?.abort()
    const value = query.trim()
    if (value.length < 2 || value.length > 100) { setError('Enter a US city or five-digit ZIP code.'); return }
    const controller = new AbortController()
    request.current = controller
    setLoading(true)
    setError(null)
    setResults([])
    const timeout = setTimeout(() => controller.abort(), 20_000)
    try {
      const params = /^\d{5}$/.test(value) ? new URLSearchParams({ zip: value }) : new URLSearchParams({ q: value, limit: '5' })
      const response = await fetch(`/api/weather/geocoding?${params}`, { signal: controller.signal })
      if (!response.ok) throw new Error('Search unavailable')
      const payload = await response.json() as GeocodingResponse | GeocodingResponse[]
      if (request.current !== controller || controller.signal.aborted) return
      const places = (Array.isArray(payload) ? payload : [payload]).filter(place => place.country === 'US' && Number.isFinite(place.lat) && Number.isFinite(place.lon) && typeof place.name === 'string')
      setResults(places)
      if (!places.length) setError('No supported US locations found. Try a city with its state or a US ZIP code.')
    } catch {
      if (request.current === controller) setError('Location search unavailable. Try again with a US city and state or ZIP code.')
    } finally {
      clearTimeout(timeout)
      if (request.current === controller) setLoading(false)
    }
  }

  return <div className="space-y-3">
    <form onSubmit={search} className="space-y-2" role="search" aria-label="Find a local winter forecast">
      <label htmlFor="winter-place" className="text-sm font-semibold">US city or ZIP code</label>
      <div className="flex gap-2"><input id="winter-place" type="search" value={query} maxLength={100} autoComplete="off" placeholder="Denver, CO or 80202" aria-describedby="winter-search-help" onChange={event => {
        request.current?.abort(); request.current = null; setLoading(false); setResults([]); setError(null); setQuery(event.target.value)
      }} className="min-w-0 flex-1 rounded border border-border bg-background px-3 py-3 text-sm focus-visible:outline-2 focus-visible:outline-primary" />
        <button type="submit" disabled={loading} className="rounded border border-primary bg-primary/10 px-4 py-3 text-sm font-mono font-bold text-foreground disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-primary">{loading ? 'Searching…' : 'Search'}</button></div>
      <p id="winter-search-help" className="text-xs text-muted-foreground">Contiguous US forecasts. No account needed. Select a result to load your forecast.</p>
    </form>
    {error && <p role="status" className="text-sm">{error}</p>}
    {results.length > 0 && <ul aria-label="Location results" className="space-y-2">{results.map((place, index) => <li key={`${place.lat}/${place.lon}/${index}`}><button type="button" onClick={() => {
      onSelect({ name: [place.name, place.state].filter(Boolean).join(', '), lat: place.lat, lon: place.lon }); setResults([])
    }} className="w-full text-left border border-border rounded p-3 text-sm hover:bg-primary/10 focus-visible:outline-2 focus-visible:outline-primary">{[place.name, place.state, 'US'].filter(Boolean).join(', ')} <span aria-hidden="true">→</span></button></li>)}</ul>}
  </div>
}
