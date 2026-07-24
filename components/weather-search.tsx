"use client"

/**
 * 16-Bit Weather Platform - v1.0.0
 * 
 * Copyright (C) 2025 16-Bit Weather
 * Licensed under Fair Source License, Version 0.9
 * 
 * Use Limitation: 5 users
 * See LICENSE file for full terms
 */


import { useState, useEffect, useRef } from "react"
import { Search, MapPin, X } from "lucide-react"
import { LoadingSpinner } from "@/components/ui/loading-state"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import CityAutocomplete from "./city-autocomplete"
import { type CityData } from "@/lib/cities"
import { useLocationContext } from "./location-context"
import { useTheme } from "./theme-provider"
import { Input } from "@/components/ui/input"

interface WeatherSearchProps {
  onSearch: (location: string) => void;
  onLocationSearch?: () => void;
  isLoading: boolean;
  error?: string;
  isDisabled?: boolean;
  rateLimitError?: string;
  hideLocationButton?: boolean;
  isAutoDetecting?: boolean;
}

export default function WeatherSearch({
  onSearch,
  onLocationSearch,
  isLoading,
  error,
  isDisabled = false,
  rateLimitError,
  hideLocationButton = false,
  isAutoDetecting = false
}: WeatherSearchProps) {
  const { locationInput, setLocationInput, clearLocationState } = useLocationContext()
  const { theme } = useTheme()
  const [searchTerm, setSearchTerm] = useState(locationInput || "")
  const [showAutocomplete, setShowAutocomplete] = useState(false)
  const isTypingRef = useRef(false)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Sync context -> local state without fighting user input.
  useEffect(() => {
    const active = document.activeElement
    const isInputFocused =
      active instanceof HTMLInputElement &&
      active.getAttribute("data-testid") === "location-search-input"

    if (!isInputFocused && !isTypingRef.current && locationInput !== searchTerm) {
      setSearchTerm(locationInput || "")
    }
  }, [locationInput, searchTerm])

  // ISS-01 fallback UX: when geolocation fails (denied / timeout / unavailable),
  // focus the search input so the user can immediately type a ZIP or city.
  // The geolocation error messages from lib/location-service.ts always contain
  // "location" in lowercase, so a case-sensitive substring check is sufficient.
  useEffect(() => {
    if (!error) return
    const isGeoError = error.includes('location') && (
      error.includes('denied') ||
      error.includes('timed out') ||
      error.includes('unavailable') ||
      error.includes('Failed to get')
    )
    if (!isGeoError) return

    const input = document.querySelector<HTMLInputElement>(
      '[data-testid="location-search-input"]'
    )
    if (input && !input.disabled) {
      input.focus()
      // Small scroll-into-view so mobile users see the input above the keyboard.
      input.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [error])


  // Semantic dark theme classes using CSS variables
  const themeClasses = {
    background: 'bg-weather-bg-elev',
    cardBg: 'bg-weather-bg-elev',
    borderColor: 'border-weather-border',
    text: 'text-weather-text',
    headerText: 'text-weather-primary',
    secondaryText: 'text-weather-text',
    accentText: 'text-weather-primary',
    successText: 'text-weather-ok',
    glow: 'glow',
    specialBorder: 'border-weather-primary',
    buttonHover: 'hover:bg-weather-primary hover:text-weather-bg',
    placeholderText: 'placeholder-weather-muted',
    hoverBorder: 'hover:border-weather-primary',
    buttonBg: 'bg-weather-bg-elev',
    buttonBorder: 'border-weather-border',
    buttonText: 'text-weather-text',
    errorBg: 'bg-weather-danger/10',
    errorText: 'text-weather-danger',
    warningText: 'text-weather-warn'
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!searchTerm.trim() || isLoading || isDisabled) {
      return;
    }

    setShowAutocomplete(false)
    onSearch(searchTerm.trim())
    // Do not clear the input here. Home navigates to /weather/[slug], and city
    // re-searches often keep the same slug (no remount). Clearing made a filled
    // bar look searchable while the controlled value was already emptied.
  }

  const handleCitySelect = (city: CityData) => {
    setSearchTerm(city.searchTerm)
    setLocationInput(city.searchTerm)
    onSearch(city.searchTerm)
    setShowAutocomplete(false)

    setTimeout(() => {
      const input = document.querySelector('input[type="text"]') as HTMLInputElement;
      if (input) {
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
      }
    }, 0);
  }

  const handleInputChange = (value: string) => {
    isTypingRef.current = true
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false
    }, 300)

    setSearchTerm(value)
    setLocationInput(value)
    setShowAutocomplete(value.length >= 2)
  }

  const handleLocationClick = () => {
    if (!isLoading && !isDisabled && onLocationSearch) {
      onLocationSearch()
    }
  }

  const handleClearClick = () => {
    if (!isLoading && !isDisabled) {
      setSearchTerm("")
      setLocationInput("")
      setShowAutocomplete(false)
      clearLocationState()
    }
  }

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
      return;
    }

    if (e.key === 'Enter' && !showAutocomplete) {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent);
    }
  }

  const handleExamplePick = (value: string) => {
    if (controlsDisabled) return
    handleInputChange(value)
    requestAnimationFrame(() => {
      document.querySelector<HTMLInputElement>('[data-testid="location-search-input"]')?.focus()
    })
  }

  const controlsDisabled = isLoading || isDisabled

  return (
    <div className="mb-4 sm:mb-6 w-full max-w-2xl mx-auto">
      <p className="mb-2 sm:mb-3 text-center px-2 text-xs sm:text-sm text-muted-foreground leading-relaxed">
        <span className="hidden sm:inline">
          Try{' '}
          <SearchExample value="90210" onPick={handleExamplePick} disabled={controlsDisabled} />
          {', '}
          <SearchExample value="New York, NY" onPick={handleExamplePick} disabled={controlsDisabled} />
          {', or '}
          <SearchExample value="London, UK" onPick={handleExamplePick} disabled={controlsDisabled} />
        </span>
        <span className="sm:hidden">
          Search by ZIP, city and state, or city and country
        </span>
      </p>

      {/* Search Form - Mobile optimized */}
      <form onSubmit={handleSubmit} className="mb-3 sm:mb-4 px-2 sm:px-0">
        <div className="relative">
          <Input
            type="text"
            data-testid="location-search-input"
            value={searchTerm}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleInputKeyDown}
            onFocus={() => searchTerm.length >= 2 && setShowAutocomplete(true)}
            placeholder={isDisabled ? "Rate limit reached…" : "Search city, state, or ZIP…"}
            disabled={controlsDisabled}
            aria-label="Search location"
            className={cn(
              "location-search-input w-full pr-10 sm:pr-12 border border-[var(--border-subtle)]",
              themeClasses.cardBg,
              themeClasses.text,
              themeClasses.placeholderText,
              "text-sm sm:text-base font-sans",
              "transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed",
              "min-h-[48px] touch-manipulation py-3 sm:py-4 px-3 sm:px-4",
              "shadow-[0_1px_2px_rgba(60,45,30,0.04)]",
              "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            )}
          />
          <div className="absolute right-2 sm:right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
            {/* Clear button */}
            {searchTerm && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleClearClick}
                disabled={controlsDisabled}
                className={cn(
                  "h-10 w-10",
                  themeClasses.secondaryText,
                  "hover:text-red-400"
                )}
                aria-label="Clear search"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </Button>
            )}

            {/* Search button */}
            <Button
              type="submit"
              variant="ghost"
              size="icon"
              disabled={controlsDisabled || !searchTerm.trim()}
              className={cn(
                "h-10 w-10",
                themeClasses.secondaryText,
                "hover:text-terminal-accent-warning",
                theme !== 'daybreak' && themeClasses.glow
              )}
              aria-label={isLoading ? "Searching..." : "Search for weather"}
            >
              {isLoading ? (
                <LoadingSpinner size="sm" label="Searching" />
              ) : (
                <Search className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
              )}
            </Button>
          </div>

          {/* City Autocomplete */}
          <CityAutocomplete
            query={searchTerm}
            onSelect={handleCitySelect}
            onQueryChange={setSearchTerm}
            theme={theme}
            isVisible={showAutocomplete}
            onVisibilityChange={setShowAutocomplete}
          />
        </div>
      </form>

      {/* Location Button - Mobile friendly */}
      {!hideLocationButton && onLocationSearch && (
        <div className="flex justify-center px-2 sm:px-0">
          <Button
            onClick={handleLocationClick}
            disabled={controlsDisabled}
            variant="outline"
            className={cn(
              "w-full sm:w-auto max-w-xs min-h-[48px]",
              "text-xs sm:text-sm uppercase tracking-wider font-mono",
              "border-0",
            )}
            aria-label={isAutoDetecting ? "Detecting your location" : isLoading ? "Loading" : isDisabled ? "Rate limited" : "Use my current location"}
          >
            <MapPin className="w-3 h-3 sm:w-4 sm:h-4 mr-2" aria-hidden="true" />
            <span>
              {isAutoDetecting ? "LOCATING..." : isLoading ? "LOADING..." : isDisabled ? "RATE LIMITED" : "USE MY LOCATION"}
            </span>
          </Button>
        </div>
      )}

      {/* Error Display - Mobile responsive */}
      {(error || rateLimitError) && (
        <div className={`p-3 sm:p-4 mx-2 sm:mx-0 ${themeClasses.errorBg} border ${themeClasses.errorText}
                      text-xs sm:text-sm text-center pixel-font ${themeClasses.specialBorder}`}>
          <div className="flex items-center justify-center gap-2 mb-2 sm:mb-3">
            <span>!</span>
            <span className="uppercase tracking-wider break-words">{error || rateLimitError}</span>
          </div>

          {/* Interactive suggestions based on error type */}
          {error?.includes('not found') && (
            <div className="space-y-2">
              <div className={`text-xs ${themeClasses.secondaryText} normal-case`}>
                Try these format examples:
              </div>
              <div className="grid grid-cols-1 gap-1 text-xs">
                <Button
                  variant="link"
                  onClick={() => setSearchTerm("90210")}
                  className={cn(
                    "justify-start h-auto py-2",
                    themeClasses.warningText,
                    "hover:text-terminal-accent",
                    theme !== 'daybreak' && themeClasses.glow
                  )}
                  disabled={isDisabled}
                >
                  90210
                </Button>
                <Button
                  variant="link"
                  onClick={() => setSearchTerm("New York, NY")}
                  className={cn(
                    "justify-start h-auto py-2",
                    themeClasses.warningText,
                    "hover:text-terminal-accent",
                    theme !== 'daybreak' && themeClasses.glow
                  )}
                  disabled={isDisabled}
                >
                  New York, NY
                </Button>
                <Button
                  variant="link"
                  onClick={() => setSearchTerm("London, UK")}
                  className={cn(
                    "justify-start h-auto py-2",
                    themeClasses.warningText,
                    "hover:text-terminal-accent",
                    theme !== 'daybreak' && themeClasses.glow
                  )}
                  disabled={isDisabled}
                >
                  London, UK
                </Button>
              </div>
            </div>
          )}

          {error?.includes('location') && error?.includes('denied') && (
            <div className={`text-xs ${themeClasses.secondaryText} normal-case mt-2 break-words`}>
              Location access was denied. Try searching manually or enable location permissions.
            </div>
          )}

          {(error?.includes('network') || error?.includes('fetch')) && (
            <div className={`text-xs ${themeClasses.secondaryText} normal-case mt-2 break-words`}>
              Network error. Please check your internet connection and try again.
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function SearchExample({
  value,
  onPick,
  disabled,
}: {
  value: string
  onPick: (value: string) => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onPick(value)}
      className="font-medium text-primary hover:underline disabled:opacity-50 disabled:pointer-events-none"
    >
      {value}
    </button>
  )
}