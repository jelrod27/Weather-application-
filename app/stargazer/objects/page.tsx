import type { Metadata } from 'next';
import Link from 'next/link';
import PageWrapper from '@/components/page-wrapper';
import catalog from '@/data/deep-sky-catalog.json';
import { safeJsonLd } from '@/lib/utils';
import type { DeepSkyObject } from '@/lib/stargazer/types';

const BASE_URL = 'https://www.16bitweather.co';
const PAGE_URL = `${BASE_URL}/stargazer/objects`;
const OBJECTS = catalog as DeepSkyObject[];
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

function formatType(type: string): string {
  return type
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatBestMonths(months: number[]): string {
  if (months.length === 0 || months.length === 12) return 'year-round';
  const sorted = [...months].sort((a, b) => a - b);
  return `${MONTH_NAMES[sorted[0] - 1]}–${MONTH_NAMES[sorted[sorted.length - 1] - 1]}`;
}

function groupByType(objects: DeepSkyObject[]): Array<{ type: string; objects: DeepSkyObject[] }> {
  const groups = new Map<string, DeepSkyObject[]>();
  for (const obj of objects) {
    const list = groups.get(obj.type) ?? [];
    list.push(obj);
    groups.set(obj.type, list);
  }
  return [...groups.entries()]
    .map(([type, list]) => ({ type, objects: list.sort((a, b) => a.id.localeCompare(b.id, 'en', { numeric: true })) }))
    .sort((a, b) => b.objects.length - a.objects.length || a.type.localeCompare(b.type));
}

const GROUPS = groupByType(OBJECTS);

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
          <Link href="/stargazer" className="hover:underline">Stargazer</Link>
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
            <Link href="/stargazer" className="text-primary underline">Stargazer</Link>{' '}
            page checks tonight&apos;s sky at your location and picks the targets that are
            well placed right now; this catalog is the full list.
          </p>
        </header>

        {GROUPS.map((group) => (
          <section key={group.type} className="rounded-md border border-border bg-card p-4">
            <h2 className="mb-3 border-b border-border pb-2 text-xs uppercase tracking-wider text-muted-foreground">
              {formatType(group.type)} <span className="text-foreground">({group.objects.length})</span>
            </h2>
            <ul className="grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
              {group.objects.map((obj) => (
                <li key={obj.id} className="flex flex-wrap items-baseline gap-x-2">
                  <Link href={`/stargazer/objects/${obj.id}`} className="text-primary hover:underline">
                    {obj.id} {obj.name}
                  </Link>
                  <span className="text-xs text-muted-foreground">
                    {obj.constellation} · mag {obj.magnitude} · {formatBestMonths(obj.bestMonths)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </PageWrapper>
  );
}
