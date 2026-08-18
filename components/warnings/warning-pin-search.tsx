'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useLocationContext } from '@/components/location-context'
import { locationService } from '@/lib/location-service'
import { persistPinLabel } from '@/lib/warnings/persist-pin'

export interface WarningPinSearchProps {
  label: string
}

export default function WarningPinSearch({ label }: WarningPinSearchProps) {
  const { setLocationInput, setCurrentLocation } = useLocationContext()
  const [query, setQuery] = useState(label)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (label) setQuery((current) => current || label)
  }, [label])

  function applyPin(nextLabel: string): void {
    if (!persistPinLabel(nextLabel)) {
      setError('Enter a city, state, or ZIP.')
      return
    }
    setError(null)
    setLocationInput(nextLabel)
    setCurrentLocation(nextLabel)
    setQuery(nextLabel)
  }

  function onSubmit(event: FormEvent): void {
    event.preventDefault()
    applyPin(query)
  }

  async function useMyLocation(): Promise<void> {
    setBusy(true)
    setError(null)
    try {
      const location = await locationService.getCurrentLocation()
      applyPin(location.displayName)
    } catch {
      setError('Could not read this device location. Search a city instead.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={onSubmit} data-testid="warning-pin-search" className="mx-auto max-w-xl space-y-2 font-mono">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="City, state, or ZIP for this pin"
          aria-label="Set warning pin location"
          data-testid="warning-pin-input"
          className="font-mono"
          disabled={busy}
        />
        <div className="flex gap-2 shrink-0">
          <Button type="submit" size="sm" className="font-mono" disabled={busy || query.trim().length < 2}>
            Set pin
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="font-mono"
            disabled={busy}
            onClick={() => void useMyLocation()}
          >
            {busy ? 'Locating…' : 'Use my location'}
          </Button>
        </div>
      </div>
      {error ? <p className="text-xs text-red-400">{error}</p> : null}
    </form>
  )
}
