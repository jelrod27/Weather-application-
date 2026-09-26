'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, BookOpen, MapPin, Search, X } from 'lucide-react'
import { ShareButtons } from '@/components/share-buttons'

interface RadarTopBarProps {
  returnHref?: string
  returnLabel?: string
  learnHref?: string
  locationName: string
  onSearch: (location: string) => void
  searchError?: string
  shareConfig: {
    title: string
    text: string
    url: string
  }
}

export function RadarTopBar({ locationName, onSearch, searchError, shareConfig, returnHref, returnLabel, learnHref }: RadarTopBarProps): React.JSX.Element {
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
        <div className="flex items-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elev)] px-2 py-1.5 text-[var(--text)] shadow-lg">
          <Link
            href={returnHref ?? '/'}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-[var(--border-subtle)] bg-[var(--bg)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            aria-label={returnLabel ?? (returnHref ? 'Back to warning' : 'Back to home')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>

          {!searchOpen ? (
            <>
              <div className="flex min-w-0 flex-1 items-center gap-2 px-1">
                <MapPin className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                <p className="truncate text-sm font-semibold" title={locationName}>{locationName}</p>
              </div>
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-[var(--border-subtle)] bg-[var(--bg)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                aria-label="Search location"
              >
                <Search className="h-5 w-5" />
              </button>
              {learnHref ? (
                <Link href={learnHref} className="hidden min-h-11 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-primary underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:inline-flex">
                  <BookOpen className="h-4 w-4" aria-hidden="true" />
                  Read this radar
                </Link>
              ) : null}
              <ShareButtons config={shareConfig} className="hidden shrink-0 gap-1 sm:flex [&>a]:min-h-11 [&>a]:min-w-11 [&>button]:min-h-11 [&>button]:min-w-11" />
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
                className="h-11 min-w-0 flex-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg)] px-3 text-sm placeholder:text-[var(--text-muted)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                autoFocus
                aria-label="Radar location search"
              />
              <button
                type="submit"
                className="inline-flex h-11 shrink-0 items-center justify-center rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                Go
              </button>
              <button
                type="button"
                onClick={() => {
                  setSearchOpen(false)
                  setQuery('')
                }}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-[var(--border-subtle)] bg-[var(--bg)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                aria-label="Close search"
              >
                <X className="h-5 w-5" />
              </button>
            </form>
          )}
        </div>

        {searchError ? (
          <p role="alert" className="rounded-lg border border-destructive/40 bg-[var(--bg-elev)] px-3 py-2 text-center text-xs text-[var(--text)]">
            {searchError}
          </p>
        ) : null}
      </div>
    </div>
  )
}
