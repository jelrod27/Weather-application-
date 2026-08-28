/**
 * 16-Bit Weather Platform - GFS Model Route Metadata
 *
 * Generates SEO metadata + static params for every region/run combination so
 * Googlebot sees a unique title/description per model run without running JS.
 */
import type { Metadata } from 'next';

const BASE_URL = 'https://www.16bitweather.co';

const REGION_NAMES: Record<string, string> = {
  us: 'Americas / CONUS',
  wus: 'West Coast',
  eus: 'East Coast',
  tropatl: 'Tropical Atlantic',
  epac: 'Eastern Pacific',
  conus: 'Continental US',
};

const REGIONS = ['us', 'wus', 'eus', 'tropatl', 'epac', 'conus'] as const;
const RUNS = ['00z', '06z', '12z', '18z'] as const;

export async function generateStaticParams(): Promise<Array<{ region: string; run: string }>> {
  return REGIONS.flatMap(region => RUNS.map(run => ({ region, run })));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ region: string; run: string }>;
}): Promise<Metadata> {
  const { region, run } = await params;
  const regionName = REGION_NAMES[region] || region.toUpperCase();
  const runTime = run.replace('z', ':00 UTC');

  const title = `GFS Model ${regionName} ${runTime} Run | 16 Bit Weather`;
  const description = `NOAA GFS ${regionName} model forecast for the ${runTime} run — mean sea level pressure and precipitation forecast graphics updated 4 times daily.`;

  return {
    title,
    description,
    robots: { index: false, follow: false },
    openGraph: {
      title,
      description,
      url: `${BASE_URL}/gfs-model/${region}/${run}`,
      siteName: '16 Bit Weather',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

export default function GFSModelLayout({ children }: { children: React.ReactNode }) {
  return children;
}
