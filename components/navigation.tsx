'use client'

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


import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, X, Home, Map, GraduationCap, Newspaper, Sun, ChevronDown, Cloud, CloudLightning, Snowflake, CloudRain, Route, Info, FileText, Star, Activity, BellRing, Plane, Mail } from "lucide-react"
import { formatHeaderLocation } from "@/lib/format-header-location"
import AuthButton from "@/components/auth/auth-button"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import WISBadge from "@/components/wis-badge"
import AlertBell from "@/components/alerts/alert-bell"

interface NavigationProps {
  weatherLocation?: string;
  weatherTemperature?: number;
  weatherUnit?: string;
}

/**
 * 16-Bit Weather Education Platform Navigation
 * 
 * Features authentic retro styling with pixel-perfect borders
 * and three-theme support (Dark/Miami/Tron) for the expanded education platform
 */
export default function Navigation({ weatherLocation, weatherTemperature, weatherUnit }: NavigationProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [weatherMenuOpen, setWeatherMenuOpen] = useState(false)
  const toggleWeatherMenu = () => setWeatherMenuOpen(prev => !prev)
  const pathname = usePathname()
  const topNavItems = [
    { href: "/", label: "HOME", icon: Home },
  ]

  const weatherItems = [
    { href: "/radar", label: "RADAR", icon: Map },
    { href: "/warnings", label: "WARNINGS", icon: BellRing },
    { href: "/alerts", label: "ALERTS", icon: Mail },
    { href: "/severe", label: "SEVERE", icon: CloudLightning },
    { href: "/winter", label: "WINTER", icon: Snowflake },
    { href: "/tropical", label: "TROPICAL", icon: CloudRain },
    { href: "/travel", label: "TRAVEL", icon: Route },
    { href: "/aviation", label: "AVIATION", icon: Plane },
    { href: "/space-weather", label: "SPACE", icon: Sun },
    { href: "/stargazer", label: "STARGAZER", icon: Star },
    { href: "/earth-sciences", label: "EARTH SCI", icon: Activity },
  ]

  const rightNavItems = [
    { href: "/education", label: "EDUCATION", icon: GraduationCap },
    { href: "/blog", label: "BLOG", icon: FileText },
    { href: "/news", label: "NEWS", icon: Newspaper },
    { href: "/about", label: "ABOUT", icon: Info },
  ]

  // All items flat for mobile menu
  const allNavItems = [
    ...topNavItems,
    ...weatherItems,
    ...rightNavItems,
  ]

  const weatherPaths = weatherItems.map(i => i.href)
  const isWeatherActive = weatherPaths.includes(pathname)

  return (
    <>
      <nav className={cn(
        "w-full sticky top-0 z-50 border-b backdrop-blur-md shadow-sm transition-all duration-300",
        "bg-background/80 border-border"
      )}>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center justify-between px-6 py-3 max-w-7xl mx-auto">
          {/* Logo/Brand with Weather Data - TOP LEFT */}
          {/* Logo/Brand with Weather Data - TOP LEFT */}
          <div className="flex items-center space-x-3">
            <h1 className="text-xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
              <span className="font-extrabold tracking-wider">16-BIT WEATHER</span>
              {weatherLocation && weatherTemperature != null ? (
                <span className="text-sm font-normal text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full border border-border">
                  {formatHeaderLocation(weatherLocation)} <span className="text-foreground font-bold">{Math.round(weatherTemperature)}°{weatherUnit === '°F' ? 'F' : 'C'}</span>
                </span>
              ) : ''}
            </h1>
          </div>

          {/* Main Navigation Links - TOP CENTER */}
          <div className="flex items-center space-x-1">
            {/* Home */}
            {topNavItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Button key={item.href} variant={isActive ? "secondary" : "ghost"} size="sm" asChild
                  className={cn("font-semibold transition-all duration-200", isActive && "font-bold shadow-sm")}>
                  <Link href={item.href} className="flex items-center gap-2">
                    <Icon className="w-4 h-4" /><span>{item.label}</span>
                  </Link>
                </Button>
              )
            })}

            {/* Weather Dropdown */}
            <div className="relative"
              onMouseEnter={() => setWeatherMenuOpen(true)}
              onMouseLeave={() => setWeatherMenuOpen(false)}
            >
              <Button
                variant={isWeatherActive ? "secondary" : "ghost"}
                size="sm"
                className={cn("font-semibold transition-all duration-200 gap-1", isWeatherActive && "font-bold shadow-sm")}
                onClick={() => toggleWeatherMenu()}
              >
                <Cloud className="w-4 h-4" />
                <span>Weather</span>
                <ChevronDown className={cn("w-3 h-3 transition-transform", weatherMenuOpen && "rotate-180")} />
              </Button>
              {weatherMenuOpen && (
                <div className="absolute top-full left-0 w-48 pt-2 z-50">
                  <div className="rounded-lg border border-border bg-background/95 backdrop-blur-lg shadow-xl animate-in slide-in-from-top-2 py-1">
                  {weatherItems.map((item) => {
                    const Icon = item.icon
                    const isActive = pathname === item.href
                    return (
                      <Link key={item.href} href={item.href}
                        className={cn(
                          "flex items-center gap-3 px-4 py-2.5 text-sm font-semibold transition-colors",
                          isActive ? "bg-secondary text-secondary-foreground" : "text-foreground hover:bg-muted"
                        )}
                        onClick={() => setWeatherMenuOpen(false)}
                      >
                        <Icon className="w-4 h-4" />{item.label}
                      </Link>
                    )
                  })}
                </div>
                </div>
              )}
            </div>

            {/* Education, Blog, News, About */}
            {rightNavItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Button key={item.href} variant={isActive ? "secondary" : "ghost"} size="sm" asChild
                  className={cn("font-semibold transition-all duration-200", isActive && "font-bold shadow-sm")}>
                  <Link href={item.href} className="flex items-center gap-2">
                    <Icon className="w-4 h-4" /><span>{item.label}</span>
                  </Link>
                </Button>
              )
            })}
          </div>

          {/* Auth Button + WIS Badge - TOP RIGHT */}
          <div className="flex items-center space-x-3">
            <WISBadge />
            <AlertBell />
            <AuthButton />
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden flex items-center justify-between px-4 py-3">
          {/* Mobile Logo with Weather Data */}
          <div className="flex items-center space-x-2 flex-1 min-w-0">
            <h1 className="text-lg font-extrabold tracking-tight text-foreground truncate flex flex-col leading-tight">
              <span className="font-extrabold tracking-wider">16-BIT WEATHER</span>
              {weatherLocation && weatherTemperature != null && (
                <span className="text-xs font-normal text-muted-foreground">
                  {Math.round(weatherTemperature)}°{weatherUnit === '°F' ? 'F' : 'C'} in {formatHeaderLocation(weatherLocation).split(',')[0]}
                </span>
              )}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <WISBadge />
            <AlertBell />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="ml-2"
            aria-label="Toggle navigation menu"
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-menu"
          >
            {isMobileMenuOpen ? (
              <X className="w-4 h-4" aria-hidden="true" />
            ) : (
              <Menu className="w-4 h-4" aria-hidden="true" />
            )}
          </Button>
        </div>

        {/* Mobile Menu Dropdown */}
        {isMobileMenuOpen && (
          <div
            id="mobile-menu"
            className="md:hidden absolute top-full left-0 right-0 border-b bg-background/95 backdrop-blur-lg shadow-xl animate-in slide-in-from-top-2"
            role="navigation"
            aria-label="Mobile navigation"
          >
            <div className="p-4 space-y-2">
              {/* All main nav items */}
              {allNavItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href

                return (
                  <Button
                    key={item.href}
                    variant={isActive ? "secondary" : "ghost"}
                    size="lg"
                    asChild
                    className="w-full justify-start"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Link href={item.href}>
                      <Icon className="w-5 h-5 mr-3" />
                      {item.label}
                    </Link>
                  </Button>
                )
              })}

              {/* Mobile Auth */}
              <div className="flex items-center justify-start gap-2 pt-4 border-t mt-4 flex-wrap">
                <AuthButton />
              </div>
            </div>
          </div>
        )}
      </nav>
    </>
  )
}