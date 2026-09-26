import { Suspense } from 'react';
import CatalogBrowser from '@/components/stargazer/CatalogBrowser';
import CatalogList from '@/components/stargazer/CatalogList';
import StargazerContextLink from '@/components/stargazer/StargazerContextLink';
import type { Metadata } from 'next';
import Link from 'next/link';
import PageWrapper from '@/components/page-wrapper';
import catalog from '@/data/deep-sky-catalog.json';
import { safeJsonLd } from '@/lib/utils';
import type { DeepSkyObject } from '@/lib/stargazer/types';

const BASE_URL = 'https://www.16bitweather.co';
const PAGE_URL = `${BASE_URL}/stargazer/objects`;
const OBJECTS = catalog as DeepSkyObject[];
const ENTRIES = OBJECTS.map(({ id, name, altNames, type, constellation, magnitude, bestMonths, nakedEyeVisible, binocularTarget, telescopeMinAperture }) => ({ id, name, altNames, type, constellation, magnitude, bestMonths, nakedEyeVisible, binocularTarget, telescopeMinAperture }));
const OG_IMAGE = `/api/og?title=${encodeURIComponent('Deep-Sky Catalog')}&subtitle=${encodeURIComponent(`${OBJECTS.length} Objects To Observe`)}`;

const DESCRIPTION = `Observing guides for ${OBJECTS.length} deep-sky objects: every Messier target plus NGC, IC and Sharpless nebulae, clusters and galaxies, with best months, magnitude and imaging tips.`;

export const metadata: Metadata = {
  // The root layout's title template appends the brand.
  title: 'Deep-Sky Object Catalog',
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: {
    title: 'Deep-Sky Object Catalog',
    description: DESCRIPTION,
    url: PAGE_URL,
    siteName: '16 Bit Weather',
    type: 'website',
    images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: 'Deep-Sky Object Catalog - 16 Bit Weather' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Deep-Sky Object Catalog',
    description: DESCRIPTION,
    images: [OG_IMAGE],
  },
};

const catalogJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  name: 'Deep-Sky Object Catalog',
  description: DESCRIPTION,
  url: PAGE_URL,
  isPartOf: { '@type': 'WebSite', name: '16 Bit Weather', url: BASE_URL },
  breadcrumb: {
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
      { '@type': 'ListItem', position: 2, name: 'Stargazer', item: `${BASE_URL}/stargazer` },
      { '@type': 'ListItem', position: 3, name: 'Deep-Sky Catalog', item: PAGE_URL },
    ],
  },
  mainEntity: {
    '@type': 'ItemList',
    numberOfItems: OBJECTS.length,
    itemListElement: OBJECTS.map((obj, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: `${obj.id} ${obj.name}`,
      url: `${PAGE_URL}/${obj.id}`,
    })),
  },
};

export default function DeepSkyCatalogPage() {
  return (
    <PageWrapper>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(catalogJsonLd) }}
      />
      <div className="mx-auto max-w-4xl space-y-6 p-4 font-mono">
        <nav aria-label="Breadcrumb" className="text-xs uppercase tracking-wider text-muted-foreground">
          <Link href="/" className="hover:underline">Home</Link>
          <span aria-hidden="true"> / </span>
          <Suspense fallback={<Link href="/stargazer">Stargazer</Link>}><StargazerContextLink className="hover:underline">Stargazer</StargazerContextLink></Suspense>
          <span aria-hidden="true"> / </span>
          <span className="text-foreground">Deep-Sky Catalog</span>
        </nav>

        <header className="rounded-md border border-border bg-card p-4">
          <h1 className="text-xl font-bold uppercase tracking-wider text-primary">
            Deep-Sky Object Catalog
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {OBJECTS.length} galaxies, nebulae and star clusters with an observing guide each:
            what the object is, how bright and how large it appears, which months put it
            highest in the evening sky, and how to image it. The{' '}
            <Suspense fallback={<Link href="/stargazer">Stargazer</Link>}><StargazerContextLink className="text-primary underline">Stargazer</StargazerContextLink></Suspense>{' '}
            page checks tonight&apos;s sky at your location and picks the targets that are
            suitable for a selected future hour; this catalog is reference material, not a promise of visibility.
          </p>
        </header>

        <Suspense fallback={<CatalogList objects={ENTRIES} />}>
          <CatalogBrowser objects={ENTRIES} />
        </Suspense>
      </div>
    </PageWrapper>
  );
}
