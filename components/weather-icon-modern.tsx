"use client"

import React from 'react'
import { cn } from '@/lib/utils'

export interface WeatherIconModernProps {
  /** Weather condition string (e.g., 'clear', 'rain', 'thunderstorm') */
  condition: string
  /** Whether it's nighttime (affects sun/moon icons) */
  isNight?: boolean
  /** Icon size in pixels */
  size?: number
  /** Additional CSS classes */
  className?: string
}

/**
 * Maps weather condition strings to our icon types
 */
function getIconType(condition: string): IconType {
  const cond = condition.toLowerCase()

  // Thunderstorm conditions
  if (cond.includes('thunder') || cond.includes('storm')) {
    return 'thunderstorm'
  }

  // Snow conditions
  if (cond.includes('snow') || cond.includes('sleet') || cond.includes('blizzard') || cond.includes('flurr')) {
    return 'snow'
  }

  // Rain conditions (check before drizzle since "light rain" should still be rain)
  if (cond.includes('rain') || cond.includes('shower')) {
    return 'rain'
  }

  // Drizzle
  if (cond.includes('drizzle')) {
    return 'drizzle'
  }

  // Fog/Mist/Haze
  if (cond.includes('fog') || cond.includes('mist') || cond.includes('haze') || cond.includes('smoke') || cond.includes('dust') || cond.includes('sand') || cond.includes('ash')) {
    return 'fog'
  }

  // Partly cloudy (check before cloudy)
  if (cond.includes('partly') || cond.includes('few clouds') || cond.includes('scattered')) {
    return 'partly-cloudy'
  }

  // Cloudy/Overcast
  if (cond.includes('cloud') || cond.includes('overcast') || cond.includes('broken')) {
    return 'cloudy'
  }

  // Clear/Sunny
  if (cond.includes('clear') || cond.includes('sunny')) {
    return 'clear'
  }

  // Default to partly cloudy
  return 'partly-cloudy'
}

type IconType = 'clear' | 'partly-cloudy' | 'cloudy' | 'rain' | 'drizzle' | 'thunderstorm' | 'snow' | 'fog'

/**
 * Modern SVG Weather Icon Component
 *
 * Clean, crisp vector icons for all weather conditions.
 * Uses terminal theme CSS variables for consistent theming.
 */
export default function WeatherIconModern({
  condition,
  isNight = false,
  size = 48,
  className
}: WeatherIconModernProps) {
  const iconType = getIconType(condition)

  const svgProps = {
    width: size,
    height: size,
    viewBox: '0 0 64 64',
    fill: 'none',
    xmlns: 'http://www.w3.org/2000/svg',
    className: cn('weather-icon-modern', className),
    style: {
      '--icon-primary': 'var(--terminal-text-primary, #e0e0e0)',
      '--icon-accent': 'var(--terminal-accent-primary, #00d4ff)',
      '--icon-secondary': 'var(--terminal-accent-secondary, #ff6ec7)',
      '--icon-warning': 'var(--terminal-accent-warning, #d29922)',
      '--icon-precip': 'var(--terminal-precip, #00d4ff)',
    } as React.CSSProperties,
    'aria-label': `Weather: ${condition}${isNight ? ' (night)' : ''}`,
    role: 'img'
  }

  switch (iconType) {
    case 'clear':
      return isNight ? <MoonIcon {...svgProps} /> : <SunIcon {...svgProps} />
    case 'partly-cloudy':
      return isNight ? <MoonCloudIcon {...svgProps} /> : <SunCloudIcon {...svgProps} />
    case 'cloudy':
      return <CloudIcon {...svgProps} />
    case 'rain':
      return <RainIcon {...svgProps} />
    case 'drizzle':
      return <DrizzleIcon {...svgProps} />
    case 'thunderstorm':
      return <ThunderstormIcon {...svgProps} />
    case 'snow':
      return <SnowIcon {...svgProps} />
    case 'fog':
      return <FogIcon {...svgProps} />
    default:
      return isNight ? <MoonCloudIcon {...svgProps} /> : <SunCloudIcon {...svgProps} />
  }
}

// SVG Icon Components
// Using consistent 2.5px stroke width for clean, modern appearance

function SunIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props}>
      {/* Sun center */}
      <circle
        cx="32"
        cy="32"
        r="10"
        stroke="var(--icon-warning)"
        strokeWidth="2.5"
        fill="var(--icon-warning)"
        fillOpacity="0.2"
      />
      {/* Sun rays */}
      <g stroke="var(--icon-warning)" strokeWidth="2.5" strokeLinecap="round">
        <line x1="32" y1="8" x2="32" y2="16" />
        <line x1="32" y1="48" x2="32" y2="56" />
        <line x1="8" y1="32" x2="16" y2="32" />
        <line x1="48" y1="32" x2="56" y2="32" />
        <line x1="14.1" y1="14.1" x2="19.8" y2="19.8" />
        <line x1="44.2" y1="44.2" x2="49.9" y2="49.9" />
        <line x1="14.1" y1="49.9" x2="19.8" y2="44.2" />
        <line x1="44.2" y1="19.8" x2="49.9" y2="14.1" />
      </g>
    </svg>
  )
}

function MoonIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props}>
      {/* Crescent moon */}
      <path
        d="M36 12c-11.046 0-20 8.954-20 20s8.954 20 20 20c3.515 0 6.818-.907 9.69-2.5a18 18 0 01-5.69-13.5c0-5.867 2.801-11.077 7.135-14.373A19.912 19.912 0 0036 12z"
        stroke="var(--icon-accent)"
        strokeWidth="2.5"
        fill="var(--icon-accent)"
        fillOpacity="0.15"
      />
      {/* Stars */}
      <circle cx="50" cy="16" r="1.5" fill="var(--icon-primary)" />
      <circle cx="54" cy="26" r="1" fill="var(--icon-primary)" />
      <circle cx="48" cy="22" r="1" fill="var(--icon-primary)" />
    </svg>
  )
}

function CloudIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props}>
      <path
        d="M16 40a8 8 0 01-.673-15.964 12 12 0 0123.346 0A8 8 0 0148 40H16z"
        stroke="var(--icon-primary)"
        strokeWidth="2.5"
        fill="var(--icon-primary)"
        fillOpacity="0.1"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function SunCloudIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props}>
      {/* Sun (behind cloud) */}
      <circle
        cx="44"
        cy="20"
        r="8"
        stroke="var(--icon-warning)"
        strokeWidth="2.5"
        fill="var(--icon-warning)"
        fillOpacity="0.2"
      />
      {/* Sun rays (partial) */}
      <g stroke="var(--icon-warning)" strokeWidth="2" strokeLinecap="round">
        <line x1="44" y1="4" x2="44" y2="9" />
        <line x1="56" y1="20" x2="61" y2="20" />
        <line x1="52.5" y1="8.5" x2="56" y2="5" />
        <line x1="55.5" y1="11.5" x2="59" y2="8" />
      </g>
      {/* Cloud (in front) */}
      <path
        d="M12 46a7 7 0 01-.59-13.97 10.5 10.5 0 0120.43 0A7 7 0 0142 46H12z"
        stroke="var(--icon-primary)"
        strokeWidth="2.5"
        fill="var(--icon-primary)"
        fillOpacity="0.15"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function MoonCloudIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props}>
      {/* Moon (behind cloud) */}
      <path
        d="M48 10c-6.075 0-11 4.925-11 16s4.925 11 11 11c1.933 0 3.75-.499 5.33-1.375a9.9 9.9 0 01-3.13-7.425c0-3.227 1.54-6.092 3.925-7.905A10.945 10.945 0 0048 10z"
        stroke="var(--icon-accent)"
        strokeWidth="2"
        fill="var(--icon-accent)"
        fillOpacity="0.15"
      />
      {/* Stars */}
      <circle cx="56" cy="12" r="1" fill="var(--icon-primary)" />
      <circle cx="58" cy="18" r="0.75" fill="var(--icon-primary)" />
      {/* Cloud (in front) */}
      <path
        d="M12 46a7 7 0 01-.59-13.97 10.5 10.5 0 0120.43 0A7 7 0 0142 46H12z"
        stroke="var(--icon-primary)"
        strokeWidth="2.5"
        fill="var(--icon-primary)"
        fillOpacity="0.15"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function RainIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props}>
      {/* Cloud */}
      <path
        d="M12 34a7 7 0 01-.59-13.97 10.5 10.5 0 0120.43 0A7 7 0 0142 34H12z"
        stroke="var(--icon-primary)"
        strokeWidth="2.5"
        fill="var(--icon-primary)"
        fillOpacity="0.1"
        strokeLinejoin="round"
      />
      {/* Rain drops */}
      <g stroke="var(--icon-precip)" strokeWidth="2.5" strokeLinecap="round">
        <line x1="16" y1="40" x2="14" y2="48" />
        <line x1="24" y1="40" x2="22" y2="50" />
        <line x1="32" y1="40" x2="30" y2="52" />
        <line x1="40" y1="40" x2="38" y2="48" />
      </g>
    </svg>
  )
}

function DrizzleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props}>
      {/* Cloud */}
      <path
        d="M12 34a7 7 0 01-.59-13.97 10.5 10.5 0 0120.43 0A7 7 0 0142 34H12z"
        stroke="var(--icon-primary)"
        strokeWidth="2.5"
        fill="var(--icon-primary)"
        fillOpacity="0.1"
        strokeLinejoin="round"
      />
      {/* Drizzle drops (smaller, dotted pattern) */}
      <g fill="var(--icon-precip)">
        <circle cx="16" cy="42" r="1.5" />
        <circle cx="16" cy="50" r="1.5" />
        <circle cx="24" cy="40" r="1.5" />
        <circle cx="24" cy="48" r="1.5" />
        <circle cx="32" cy="42" r="1.5" />
        <circle cx="32" cy="50" r="1.5" />
        <circle cx="40" cy="40" r="1.5" />
        <circle cx="40" cy="48" r="1.5" />
      </g>
    </svg>
  )
}

function ThunderstormIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props}>
      {/* Dark cloud */}
      <path
        d="M12 32a7 7 0 01-.59-13.97 10.5 10.5 0 0120.43 0A7 7 0 0142 32H12z"
        stroke="var(--icon-primary)"
        strokeWidth="2.5"
        fill="var(--icon-primary)"
        fillOpacity="0.2"
        strokeLinejoin="round"
      />
      {/* Lightning bolt */}
      <path
        d="M30 34l-4 10h6l-4 12 10-14h-6l4-8z"
        stroke="var(--icon-warning)"
        strokeWidth="2"
        fill="var(--icon-warning)"
        strokeLinejoin="round"
      />
      {/* Rain drops */}
      <g stroke="var(--icon-precip)" strokeWidth="2" strokeLinecap="round">
        <line x1="14" y1="38" x2="12" y2="44" />
        <line x1="42" y1="38" x2="40" y2="44" />
      </g>
    </svg>
  )
}

function SnowIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props}>
      {/* Cloud */}
      <path
        d="M12 32a7 7 0 01-.59-13.97 10.5 10.5 0 0120.43 0A7 7 0 0142 32H12z"
        stroke="var(--icon-primary)"
        strokeWidth="2.5"
        fill="var(--icon-primary)"
        fillOpacity="0.1"
        strokeLinejoin="round"
      />
      {/* Snowflakes */}
      <g stroke="var(--icon-accent)" strokeWidth="1.5" strokeLinecap="round">
        {/* Snowflake 1 */}
        <line x1="16" y1="40" x2="16" y2="48" />
        <line x1="12" y1="44" x2="20" y2="44" />
        <line x1="13" y1="41" x2="19" y2="47" />
        <line x1="19" y1="41" x2="13" y2="47" />

        {/* Snowflake 2 */}
        <line x1="32" y1="38" x2="32" y2="46" />
        <line x1="28" y1="42" x2="36" y2="42" />
        <line x1="29" y1="39" x2="35" y2="45" />
        <line x1="35" y1="39" x2="29" y2="45" />

        {/* Snowflake 3 */}
        <line x1="42" y1="42" x2="42" y2="50" />
        <line x1="38" y1="46" x2="46" y2="46" />
        <line x1="39" y1="43" x2="45" y2="49" />
        <line x1="45" y1="43" x2="39" y2="49" />
      </g>
    </svg>
  )
}

function FogIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props}>
      {/* Fog lines - horizontal wavy lines */}
      <g stroke="var(--icon-primary)" strokeWidth="2.5" strokeLinecap="round" opacity="0.9">
        <path d="M8 24h48" />
        <path d="M12 32h40" opacity="0.7" />
        <path d="M8 40h48" opacity="0.5" />
        <path d="M14 48h36" opacity="0.3" />
      </g>
      {/* Subtle sun behind fog */}
      <circle
        cx="42"
        cy="18"
        r="6"
        stroke="var(--icon-warning)"
        strokeWidth="2"
        fill="var(--icon-warning)"
        fillOpacity="0.1"
        opacity="0.4"
      />
    </svg>
  )
}
