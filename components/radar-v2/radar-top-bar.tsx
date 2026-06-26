'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, MapPin, Search, X } from 'lucide-react'
import { ShareButtons } from '@/components/share-buttons'

interface RadarTopBarProps {
  locationName: string
  onSearch: (location: string) => void
  searchError?: string
  shareConfig: {
    title: string
    text: string
    url: string
  }
}

export function RadarTopBar({ locationName, onSearch, searchError, shareConfig }: RadarTopBarProps) {
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')

  const submitSearch = () => {
    const trimmed = query.trim()
    if (!trimmed) return
    onSearch(trimmed)
    setSearchOpen(false)
    setQuery('')
  }

  return (
    <div
      data-testid="radar-top-bar"
      className="pointer-events-none absolute inset-x-0 top-0 z-[2600] px-3 pt-[max(0.75rem,env(safe-area-inset-top))]"
    >
      <div className="pointer-events-auto mx-auto flex max-w-5xl flex-col gap-2">
        <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-zinc-950/90 px-2 py-2 shadow-lg backdrop-blur-md">
          <Link
            href="/"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white hover:bg-white/10"
            aria-label="Back to home"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>

          {!searchOpen ? (
            <>
              <div className="flex min-w-0 flex-1 items-center gap-2 px-1">
                <MapPin className="h-4 w-4 shrink-0 text-cyan-400" aria-hidden="true" />
                <p className="truncate text-sm font-semibold text-white sm:text-base">{locationName}</p>
              </div>
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white hover:bg-white/10"
                aria-label="Search location"
              >
                <Search className="h-5 w-5" />
              </button>
              <ShareButtons config={shareConfig} className="shrink-0 gap-1" />
            </>
          ) : (
            <form
              className="flex min-w-0 flex-1 items-center gap-2"
              onSubmit={(event) => {
                event.preventDefault()
                submitSearch()
              }}
            >
              <input
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="City, ZIP, or coordinates"
                className="h-11 min-w-0 flex-1 rounded-xl border border-white/15 bg-black/40 px-3 text-sm text-white placeholder:text-zinc-500 focus:border-cyan-400/50 focus:outline-none"
                autoFocus
                aria-label="Radar location search"
              />
              <button
                type="submit"
                className="inline-flex h-11 shrink-0 items-center justify-center rounded-xl bg-cyan-500 px-4 text-sm font-semibold text-white hover:bg-cyan-400"
              >
                Go
              </button>
              <button
                type="button"
                onClick={() => {
                  setSearchOpen(false)
                  setQuery('')
                }}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white hover:bg-white/10"
                aria-label="Close search"
              >
                <X className="h-5 w-5" />
              </button>
            </form>
          )}
        </div>

        {searchError ? (
          <p className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-center text-xs text-red-200">
            {searchError}
          </p>
        ) : null}
      </div>
    </div>
  )
}
