import type { Metadata } from 'next'
import Link from 'next/link'
import PageWrapper from '@/components/page-wrapper'
import { cityDirectoryCount, getCityDirectory } from '@/lib/seo/city-directory'
import { safeJsonLd } from '@/lib/utils'

const BASE_URL = 'https://www.16bitweather.co'
const PAGE_URL = `${BASE_URL}/weather`
const CITY_COUNT = cityDirectoryCount()
const OG_IMAGE = `/api/og?title=${encodeURIComponent('City Climate Guides')}&subtitle=${encodeURIComponent(`${CITY_COUNT} US Cities`)}`

const DESCRIPTION = `Climate guides for ${CITY_COUNT} US cities: monthly averages, seasonal patterns, best time to visit and live forecasts, grouped by climate type.`

export const metadata: Metadata = {
  // The root layout's title template appends the brand.
  title: 'US City Climate Guides',
  description: DESCRIPTION,
  keywords:
    'city climate guides, us city weather, monthly weather averages, climate by city, best time to visit, year round weather',
  alternates: { canonical: PAGE_URL },
  openGraph: {
    title: 'US City Climate Guides',
    description: DESCRIPTION,
    url: PAGE_URL,
    siteName: '16 Bit Weather',
    type: 'website',
    images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: 'US City Climate Guides' }],
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'US City Climate Guides',
    description: DESCRIPTION,
    images: [OG_IMAGE],
  },
}

const GROUPS = getCityDirectory()

const directoryJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  name: 'US City Climate Guides',
  description: DESCRIPTION,
  url: PAGE_URL,
  isPartOf: { '@type': 'WebSite', name: '16 Bit Weather', url: BASE_URL },
  breadcrumb: {
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
      { '@type': 'ListItem', position: 2, name: 'City Climate Guides', item: PAGE_URL },
    ],
  },
  mainEntity: {
    '@type': 'ItemList',
    numberOfItems: CITY_COUNT,
    itemListElement: GROUPS.flatMap((group) => group.cities).map((city, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: `${city.name}, ${city.state}`,
      url: `${BASE_URL}/weather/${city.slug}`,
    })),
  },
}

export default function CityDirectoryPage() {
  return (
    <PageWrapper>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(directoryJsonLd) }}
      />
      <div className="mx-auto max-w-4xl space-y-8 px-4 py-8 font-mono">
        <nav aria-label="Breadcrumb" className="text-xs uppercase tracking-wider text-muted-foreground">
          <Link href="/" className="hover:underline">
            Home
          </Link>
          <span aria-hidden="true"> / </span>
          <span className="text-foreground">City climate guides</span>
        </nav>

        <header className="space-y-3">
          <h1 className="text-2xl font-bold uppercase tracking-wider text-primary sm:text-3xl">
            US City Climate Guides
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Every city here has a climate guide: average highs and lows for all twelve months, what
            each season actually feels like, the hazards worth knowing about, and when to visit if
            the weather matters. Each one also carries a live forecast at the top. Cities are
            grouped by Köppen climate classification, so neighbours in this list behave alike even
            when they sit a thousand miles apart.
          </p>
          <p className="text-xs text-muted-foreground">
            Looking for somewhere not listed? Search any city from the{' '}
            <Link href="/" className="text-primary underline">
              home page
            </Link>{' '}
            for a live forecast, or read the{' '}
            <Link href="/education/glossary" className="text-primary underline">
              weather glossary
            </Link>{' '}
            to decode the numbers.
          </p>
        </header>

        {GROUPS.map((group) => (
          <section key={group.family} className="rounded-md border border-border bg-card p-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-primary">
              {group.family}{' '}
              <span className="font-normal text-muted-foreground">({group.cities.length})</span>
            </h2>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted-foreground">
              {group.blurb}
            </p>
            <ul className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
              {group.cities.map((city) => (
                <li key={city.slug} className="flex flex-wrap items-baseline gap-x-2">
                  <Link
                    href={`/weather/${city.slug}`}
                    className="text-primary hover:underline"
                  >
                    {city.name}, {city.state}
                  </Link>
                  {city.summerHigh !== null && city.winterHigh !== null ? (
                    <span className="text-xs tabular-nums text-muted-foreground">
                      Jul {city.summerHigh}°F · Jan {city.winterHigh}°F
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </PageWrapper>
  )
}
