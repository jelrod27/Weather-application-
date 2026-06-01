import type { Launch } from '@/lib/stargazer/types';
import { fetchWithTimeout } from '@/lib/fetch-with-timeout';

const LAUNCH_LIBRARY_BASE = 'https://ll.thespacedevs.com/2.2.0';

interface LaunchLibraryResult {
  id: string;
  name: string;
  slug: string;
  net: string;
  status: { name: string };
  launch_service_provider: { name: string } | null;
  rocket: { configuration: { name: string } } | null;
  pad: {
    name: string;
    location: { name: string };
    map_url: string | null;
  } | null;
  mission: {
    name: string;
    description: string;
    type: string;
  } | null;
  vid_urls: Array<{ url: string }> | null;
  image: { thumbnail_url: string } | string | null;
}

interface LaunchLibraryResponse {
  results: LaunchLibraryResult[];
}

/**
 * Fetch upcoming rocket launches from Launch Library 2.
 */
export async function fetchUpcomingLaunches(
  limit: number = 10
): Promise<Launch[]> {
  try {
    const url = `${LAUNCH_LIBRARY_BASE}/launch/upcoming/?limit=${limit}&mode=normal`;
    const res = await fetchWithTimeout(url, { next: { revalidate: 1800 } });

    if (!res.ok) {
      console.error('[Launches] HTTP error:', res.status);
      return [];
    }

    const data = (await res.json()) as LaunchLibraryResponse;

    if (!data.results || !Array.isArray(data.results)) {
      console.error('[Launches] Unexpected response format');
      return [];
    }

    return data.results.map((item): Launch => {
      const missionType = item.mission?.type ?? '';
      const isCrewed =
        missionType.includes('Human Exploration') ||
        missionType.includes('Crew');

      const imageUrl =
        item.image && typeof item.image === 'object'
          ? item.image.thumbnail_url
          : typeof item.image === 'string'
            ? item.image
            : null;

      return {
        id: item.id,
        name: item.name,
        net: new Date(item.net),
        status: item.status?.name ?? 'Unknown',
        provider: item.launch_service_provider?.name ?? 'Unknown',
        vehicle: item.rocket?.configuration?.name ?? 'Unknown',
        padName: item.pad?.name ?? 'Unknown',
        padLocation: item.pad?.location?.name ?? 'Unknown',
        padMapUrl: item.pad?.map_url ?? null,
        missionName: item.mission?.name ?? '',
        missionDescription: item.mission?.description ?? '',
        missionType,
        isCrewed,
        slug: item.slug ?? '',
        videoUrls: item.vid_urls?.map((v) => v.url) ?? [],
        imageUrl,
      };
    });
  } catch (error) {
    console.error('[Launches] Fetch failed:', error);
    return [];
  }
}
