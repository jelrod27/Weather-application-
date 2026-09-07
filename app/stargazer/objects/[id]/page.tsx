import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import PageWrapper from '@/components/page-wrapper';
import ObjectDetail from '@/components/stargazer/ObjectDetail';
import catalog from '@/data/deep-sky-catalog.json';
import { clampDescription } from '@/lib/seo/clamp-description';
import type { DeepSkyObject } from '@/lib/stargazer/types';

interface PageProps {
  params: Promise<{ id: string }>;
}

function getCatalogObject(id: string): DeepSkyObject | undefined {
  return (catalog as DeepSkyObject[]).find((obj) => obj.id.toLowerCase() === id.toLowerCase());
}

export function generateStaticParams() {
  return (catalog as DeepSkyObject[]).map((obj) => ({ id: obj.id }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const obj = getCatalogObject(id);
  if (!obj) return { title: 'Object Not Found' };

  // The root layout's title template appends the brand.
  const title = `${obj.id} ${obj.name}: Observing Guide`;
  const description = clampDescription(obj.longDescription || obj.description);
  const ogImage = `/api/og?title=${encodeURIComponent(obj.id)}&subtitle=${encodeURIComponent(obj.name)}`;
  const pageUrl = `https://www.16bitweather.co/stargazer/objects/${obj.id}`;

  return {
    title,
    description,
    openGraph: {
      title: `${obj.id} - ${obj.name}`,
      description,
      url: pageUrl,
      siteName: '16 Bit Weather',
      type: 'article',
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: `${obj.id} - ${obj.name}`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${obj.id} - ${obj.name}`,
      description,
      images: [ogImage],
    },
    alternates: {
      canonical: pageUrl,
    },
  };
}

export default async function DeepSkyObjectPage({ params }: PageProps) {
  const { id } = await params;
  const obj = getCatalogObject(id);
  if (!obj) notFound();

  // PageWrapper gives the page the site nav and footer, so each object page
  // links out to the rest of the site instead of only "Back to Stargazer".
  return (
    <PageWrapper>
      <ObjectDetail object={obj} />
    </PageWrapper>
  );
}
