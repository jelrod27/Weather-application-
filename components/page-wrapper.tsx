"use client"

/**
 * 16-Bit Weather Platform - v1.0.0
 *
 * Copyright (C) 2025 16-Bit Weather
 * Licensed under Fair Source License, Version 0.9
 *
 * Use Limitation: 5 users
 * See LICENSE file for full terms
 *
 * BETA SOFTWARE NOTICE:
 * This software is in active development. Features may change.
 * Report issues: https://github.com/deephouse23/Weather-application-/issues
 */


import Navigation from "./navigation"
import Link from "next/link"
import { getFeaturedCities } from "@/lib/featured-city-links"

interface PageWrapperProps {
  children: React.ReactNode
  weatherLocation?: string
  weatherTemperature?: number
  weatherUnit?: string
}

/**
 * Page Wrapper for 16-Bit Weather Education Platform
 *
 * Handles theme management and provides consistent navigation
 * across all pages in the education platform.
 *
 * Uses CSS variables for theming - colors automatically adapt
 * based on the data-theme attribute set by ThemeProvider.
 */
export default function PageWrapper({ children, weatherLocation, weatherTemperature, weatherUnit }: PageWrapperProps) {
  const featuredCities = getFeaturedCities().slice(0, 10)

  return (
    <div className="min-h-screen bg-background text-foreground relative">
      <Navigation
        weatherLocation={weatherLocation}
        weatherTemperature={weatherTemperature}
        weatherUnit={weatherUnit}
      />
      <main className="relative z-10">
        {children}
      </main>
      <footer className="border-t border-border/40 bg-black/30 mt-16">
        <div className="max-w-7xl mx-auto px-4 py-10">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 text-sm font-mono">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Weather</h3>
              <nav className="flex flex-col gap-1.5">
                <Link href="/radar" className="text-muted-foreground hover:text-foreground transition-colors">Radar</Link>
                <Link href="/severe" className="text-muted-foreground hover:text-foreground transition-colors">Severe Weather</Link>
                <Link href="/aviation" className="text-muted-foreground hover:text-foreground transition-colors">Aviation</Link>
                <Link href="/space-weather" className="text-muted-foreground hover:text-foreground transition-colors">Space Weather</Link>
                <Link href="/stargazer" className="text-muted-foreground hover:text-foreground transition-colors">Stargazer</Link>
                <Link href="/tropical" className="text-muted-foreground hover:text-foreground transition-colors">Tropical</Link>
                <Link href="/winter" className="text-muted-foreground hover:text-foreground transition-colors">Winter</Link>
                <Link href="/earth-sciences" className="text-muted-foreground hover:text-foreground transition-colors">Earth Sciences</Link>
              </nav>
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Cities</h3>
              <nav aria-label="Popular city weather forecasts" className="flex flex-col gap-1.5">
                {featuredCities.map((city) => (
                  <Link
                    key={city.slug}
                    href={`/weather/${city.slug}`}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {city.label}
                  </Link>
                ))}
              </nav>
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Tools</h3>
              <nav className="flex flex-col gap-1.5">
                <Link href="/warnings" className="text-muted-foreground hover:text-foreground transition-colors">Warnings</Link>
                <Link href="/extremes" className="text-muted-foreground hover:text-foreground transition-colors">Extremes</Link>
                <Link href="/hourly" className="text-muted-foreground hover:text-foreground transition-colors">Hourly</Link>
                <Link href="/travel" className="text-muted-foreground hover:text-foreground transition-colors">Travel</Link>
                <Link href="/map" className="text-muted-foreground hover:text-foreground transition-colors">Map</Link>
              </nav>
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Learn</h3>
              <nav className="flex flex-col gap-1.5">
                <Link href="/education" className="text-muted-foreground hover:text-foreground transition-colors">Education</Link>
                <Link href="/education/glossary" className="text-muted-foreground hover:text-foreground transition-colors">Weather Glossary</Link>
                <Link href="/blog" className="text-muted-foreground hover:text-foreground transition-colors">Blog</Link>
                <Link href="/news" className="text-muted-foreground hover:text-foreground transition-colors">News</Link>
                <Link href="/cloud-types" className="text-muted-foreground hover:text-foreground transition-colors">Cloud Types</Link>
                <Link href="/fun-facts" className="text-muted-foreground hover:text-foreground transition-colors">Fun Facts</Link>
              </nav>
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Site</h3>
              <nav className="flex flex-col gap-1.5">
                <Link href="/about" className="text-muted-foreground hover:text-foreground transition-colors">About</Link>
                <Link href="/weather-systems" className="text-muted-foreground hover:text-foreground transition-colors">Weather Systems</Link>
              </nav>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-border/30 text-center text-xs font-mono text-muted-foreground">
            <p>&copy; <span suppressHydrationWarning>{new Date().getFullYear()}</span> 16-Bit Weather. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
} 