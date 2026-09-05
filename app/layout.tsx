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
 * Report issues: https://github.com/jelrod27/Weather-application-/issues
 */

import type React from "react"
import "./globals.css"
import type { Metadata } from "next"
import { IBM_Plex_Sans, Inconsolata, VT323 } from "next/font/google"
import {
  HOMEPAGE_DESCRIPTION,
  HOMEPAGE_OG_IMAGE,
  HOMEPAGE_OG_TITLE,
  HOMEPAGE_TITLE,
} from "@/lib/seo/homepage"
// PERFORMANCE: Analytics lazy loaded via client component wrapper
import AnalyticsWrapper from "@/components/analytics-wrapper"
import AppThemeProvider from "@/app/providers/ThemeProvider"
import { DEFAULT_THEME } from "@/lib/theme-config"
import { LocationProvider } from "@/components/location-context"
import { AuthProvider } from "@/lib/auth"
import { Toaster } from "@/components/ui/toaster"
import ErrorBoundaryWrapper from "@/components/error-boundary"
// AuthDebug removed — dev-only panel was cluttering the UI

// PERFORMANCE: Use next/font for non-blocking font loading
// Include all weights used in codebase (400, 500, 600, 700, 800)
const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-ui",
  weight: ["400", "500", "600", "700"],
})

const inconsolata = Inconsolata({
  subsets: ["latin"],
  display: 'swap',
  variable: '--font-inconsolata',
  weight: ['400', '500', '600', '700', '800'], // 500=medium, 800=extrabold used in components
})

const vt323 = VT323({
  subsets: ["latin"],
  display: 'swap',
  variable: '--font-vt323',
  weight: '400',
})

export const metadata: Metadata = {
  title: HOMEPAGE_TITLE,
  description: HOMEPAGE_DESCRIPTION,
  keywords: "live weather, weather radar, space weather, kp index, solar flares, nws warnings, city climate, weather glossary, 16 bit weather",
  generator: 'Next.js',
  applicationName: '16 Bit Weather',
  authors: [{ name: '16 Bit Weather' }],
  creator: '16 Bit Weather',
  publisher: '16 Bit Weather',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://www.16bitweather.co'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: HOMEPAGE_OG_TITLE,
    description: HOMEPAGE_DESCRIPTION,
    url: 'https://www.16bitweather.co',
    siteName: '16 Bit Weather',
    images: [
      {
        url: HOMEPAGE_OG_IMAGE,
        width: 1200,
        height: 630,
        alt: '16 Bit Weather — live forecasts, radar, and space weather',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: HOMEPAGE_OG_TITLE,
    description: HOMEPAGE_DESCRIPTION,
    images: [HOMEPAGE_OG_IMAGE],
    creator: '@16bitweather',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION_CODE || undefined,
  },
  icons: {
    icon: [
      {
        url: '/favicon.ico',
        sizes: '32x32',
        type: 'image/x-icon',
      },
      {
        url: '/favicon.svg',
        type: 'image/svg+xml',
      }
    ],
    shortcut: '/favicon.ico',
    apple: {
      url: '/apple-touch-icon.png',
      sizes: '180x180',
      type: 'image/png',
    }
  },
  other: {
    'theme-color': '#0a0a1a',
    'msapplication-TileColor': '#0a0a1a',
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'black-translucent',
    'geo.region': 'US',
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" data-theme={DEFAULT_THEME} suppressHydrationWarning>
      <head>
        {/* PERFORMANCE: Preconnect to critical origins for faster resource loading */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Map tile sources - preconnect for faster map loading */}
        <link rel="preconnect" href="https://a.basemaps.cartocdn.com" />
        <link rel="preconnect" href="https://b.basemaps.cartocdn.com" />
        <link rel="dns-prefetch" href="https://c.basemaps.cartocdn.com" />
        <link rel="dns-prefetch" href="https://d.basemaps.cartocdn.com" />
        {/* Radar data sources */}
        <link rel="dns-prefetch" href="https://mesonet.agron.iastate.edu" />
        <link rel="dns-prefetch" href="https://pollen.googleapis.com" />
        <link rel="dns-prefetch" href="https://www.google.com" />
      </head>
      <body className={`${ibmPlexSans.variable} ${inconsolata.variable} ${vt323.variable} min-h-screen font-sans antialiased`} style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}>
        <ErrorBoundaryWrapper>
          <AuthProvider>
            <AppThemeProvider>
              <LocationProvider>
                <div className="theme-enforced min-h-screen" style={{ backgroundColor: 'inherit', color: 'inherit' }}>
                  {children}
                </div>
                <Toaster />
              </LocationProvider>
            </AppThemeProvider>
          </AuthProvider>
        </ErrorBoundaryWrapper>
        <AnalyticsWrapper />
      </body>
    </html>
  )
}
