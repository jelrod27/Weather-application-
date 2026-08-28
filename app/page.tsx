/**
 * 16-Bit Weather Platform - Homepage
 *
 * Copyright (C) 2025 16-Bit Weather
 * Licensed under Fair Source License, Version 0.9
 *
 * Server Component wrapper for SEO optimization
 * PERFORMANCE: Uses streaming SSR with Suspense for faster LCP
 */

import type { Metadata } from 'next'
import { Suspense } from 'react'
import dynamic from 'next/dynamic'
import { safeJsonLd } from '@/lib/utils'
import { WeatherCardsSkeleton } from '@/components/home-shell'
import FeaturedCityLinks from '@/components/featured-city-links'
import {
  HOMEPAGE_DESCRIPTION,
  HOMEPAGE_OG_IMAGE,
  HOMEPAGE_OG_TITLE,
  HOMEPAGE_TITLE,
} from '@/lib/seo/homepage'

// PERFORMANCE: Use next/dynamic for proper SSR streaming with fallback
// This enables the server-rendered shell to display immediately as LCP
const HomeClient = dynamic(() => import('./home-client'), {
  ssr: true, // Enable SSR but lazy-load the component
})

export const metadata: Metadata = {
  title: HOMEPAGE_TITLE,
  description: HOMEPAGE_DESCRIPTION,
  keywords: 'live weather, weather radar, space weather, kp index, solar flares, nws warnings, city climate, weather glossary, 16 bit weather',
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
  alternates: {
    canonical: 'https://www.16bitweather.co',
  },
}

const SITE_URL = 'https://www.16bitweather.co'

// JSON-LD structured data for the homepage (Organization + WebSite + WebApplication)
const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: '16 Bit Weather',
      url: SITE_URL,
      logo: `${SITE_URL}/favicon.svg`,
    },
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      url: SITE_URL,
      name: '16 Bit Weather',
      description: HOMEPAGE_DESCRIPTION,
      publisher: { '@id': `${SITE_URL}/#organization` },
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: `${SITE_URL}/weather/{search_term_string}`,
        },
        'query-input': 'required name=search_term_string',
      },
    },
    {
      '@type': 'WebApplication',
      '@id': `${SITE_URL}/#webapp`,
      name: '16 Bit Weather',
      description: HOMEPAGE_DESCRIPTION,
      url: SITE_URL,
      applicationCategory: 'WeatherApplication',
      operatingSystem: 'Web',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
      },
      author: { '@id': `${SITE_URL}/#organization` },
      featureList: [
        'Real-time weather data',
        '7-day weather forecast',
        'North America weather radar',
        'Air quality index',
        'Pollen count',
        'UV index',
        'Hourly forecast',
        'Space weather monitor',
        'City weather search',
      ],
    },
  ],
}

/**
 * Server-rendered shell for LCP optimization
 * This renders immediately while the client component loads
 * Contains a large text element that becomes the LCP
 */
function HomePageShell() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* LCP text only — document h1 lives on HomePage so the fallback is not a second heading */}
        <p
          className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-center mb-8 text-primary glow"
          style={{
            fontFamily: 'var(--theme-font), monospace',
            contentVisibility: 'auto',
            containIntrinsicSize: '0 80px'
          }}
        >
          16 BIT WEATHER
        </p>

        {/* Search placeholder */}
        <div className="w-full max-w-2xl mx-auto mb-6">
          <div className="flex gap-2">
            <div className="flex-1 h-12 rounded-md border-2 bg-gray-800/50 border-gray-700 animate-pulse" />
            <div className="w-24 h-12 rounded-md border-2 bg-gray-700/50 border-gray-600 animate-pulse" />
          </div>
        </div>

        {/* Welcome message */}
        <div className="text-center mt-8 mb-8 px-2 sm:px-0">
          <div className="w-full max-w-xl mx-auto">
            <div className="p-2 sm:p-3 container-outer">
              <p className="text-sm font-bold uppercase tracking-wider text-white" style={{
                fontSize: "clamp(10px, 2.4vw, 14px)"
              }}>
                ══ INITIALIZING WEATHER TERMINAL ══
              </p>
            </div>
          </div>
        </div>

        {/* Weather cards skeleton */}
        <WeatherCardsSkeleton />
      </div>
    </div>
  )
}

export default function HomePage() {
  return (
    <>
      {/* JSON-LD structured data - safe as jsonLd is a static constant */}
      <h1 className="sr-only">Live weather, radar, and space weather from 16 Bit Weather</h1>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
      />
      {/* PERFORMANCE: Suspense boundary for streaming - shell renders server-side */}
      <Suspense fallback={<HomePageShell />}>
        <HomeClient />
      </Suspense>
      {/* Crawlable city links — server-rendered (RandomCityLinks is client-only / ssr:false) */}
      <FeaturedCityLinks title="Weather by city" />
    </>
  )
}
