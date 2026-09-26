import { fetchWithTimeout } from '@/lib/fetch-with-timeout';

export interface TropicalGraphicSource {
  title: string;
  desc: string;
  src: string;
  link: string;
}

export const TROPICAL_GRAPHICS: TropicalGraphicSource[] = [
  {
    title: '2-DAY TROPICAL OUTLOOK',
    desc: '48-hour tropical weather formation potential for the Atlantic Basin',
    src: `https://www.nhc.noaa.gov/xgtwo/two_atl_2d0.png`,
    link: `https://www.nhc.noaa.gov/gtwo.php`,
  },
  {
    title: '7-DAY TROPICAL OUTLOOK',
    desc: 'Extended tropical weather formation potential for the Atlantic Basin',
    src: `https://www.nhc.noaa.gov/xgtwo/two_atl_5d0.png`,
    link: `https://www.nhc.noaa.gov/gtwo.php`,
  },
  {
    title: 'ATLANTIC SATELLITE',
    desc: 'Latest available GOES-East GeoColor image of the Atlantic basin',
    src: `https://cdn.star.nesdis.noaa.gov/GOES19/ABI/SECTOR/taw/GEOCOLOR/1800x1080.jpg`,
    link: `https://www.nhc.noaa.gov/satellite.php`,
  },
  {
    title: 'SEA SURFACE TEMPERATURE',
    desc: 'Daily Atlantic sea surface temperature analysis — one factor in tropical development',
    src: `https://www.nhc.noaa.gov/tafb/sst_loop/14_atl.png`,
    link: `https://www.nhc.noaa.gov/sst/`,
  },
];

/** File modification time is distinct from the observation/valid time printed in the image. */
export async function getGraphicUpdatedAt(src: string): Promise<string | null> {
  try {
    const response = await fetchWithTimeout(src, { method: 'HEAD', cache: 'no-store', timeoutMs: 3000, maxRetries: 0 });
    const modified = response.headers.get('last-modified');
    if (!response.ok || !modified || !Number.isFinite(Date.parse(modified))) return null;
    return new Date(modified).toISOString();
  } catch (error) {
    console.error('[Tropical] Could not read source update time', { src, error });
    return null;
  }
}
