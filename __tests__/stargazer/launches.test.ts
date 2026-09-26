/**
 * Tests for Stargazer Launch Data Fetching
 */

import { fetchUpcomingLaunches } from '@/lib/stargazer/launches';

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('fetchUpcomingLaunches', () => {
  afterEach(() => {
    mockFetch.mockReset();
  });

  it('returns launches with slug, videoUrls, imageUrl, and padMapUrl fields', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [
          {
            id: 'abc-123',
            name: 'Falcon 9 | Starlink Group 10-63',
            slug: 'falcon-9-block-5-starlink-group-10-63',
            net: '2026-04-10T12:00:00Z',
            status: { name: 'Go' },
            launch_service_provider: { name: 'SpaceX' },
            rocket: { configuration: { name: 'Falcon 9' } },
            pad: {
              name: 'SLC-40',
              location: { name: 'Cape Canaveral, FL' },
              map_url: 'https://maps.google.com/?q=28.5618,-80.577',
            },
            mission: {
              name: 'Starlink Group 10-63',
              description: 'A batch of Starlink satellites.',
              type: 'Communications',
            },
            vid_urls: [{ url: 'https://youtube.com/watch?v=abc' }],
            image: { thumbnail_url: 'https://example.com/image.jpg' },
          },
        ],
      }),
    });

    const launches = await fetchUpcomingLaunches(1);

    expect(launches).toHaveLength(1);
    expect(launches![0].slug).toBe('falcon-9-block-5-starlink-group-10-63');
    expect(launches![0].videoUrls).toEqual(['https://youtube.com/watch?v=abc']);
    expect(launches![0].imageUrl).toBe('https://example.com/image.jpg');
    expect(launches![0].padMapUrl).toBe('https://maps.google.com/?q=28.5618,-80.577');
  });

  it('handles null vid_urls, string image, and missing pad map_url', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [
          {
            id: 'def-456',
            name: 'SLS | Artemis II',
            slug: 'sls-block-1-artemis-ii',
            net: '2026-09-01T14:00:00Z',
            status: { name: 'TBD' },
            launch_service_provider: { name: 'NASA' },
            rocket: { configuration: { name: 'SLS' } },
            pad: { name: 'LC-39B', location: { name: 'KSC, FL' }, map_url: null },
            mission: { name: 'Artemis II', description: 'Crewed lunar flyby', type: 'Human Exploration' },
            vid_urls: null,
            image: 'https://example.com/sls.jpg',
          },
        ],
      }),
    });

    const launches = await fetchUpcomingLaunches(1);

    expect(launches![0].videoUrls).toEqual([]);
    expect(launches![0].imageUrl).toBe('https://example.com/sls.jpg');
    expect(launches![0].padMapUrl).toBeNull();
    expect(launches![0].isCrewed).toBe(true);
  });
});

it('distinguishes a failed provider from a successful empty schedule', async () => {
  mockFetch.mockResolvedValueOnce({ ok: false, status: 503 } as Response);
  const silence = jest.spyOn(console, 'error').mockImplementation(() => {});
  expect(await fetchUpcomingLaunches()).toBeNull();
  mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ results: [] }) } as Response);
  expect(await fetchUpcomingLaunches()).toEqual([]);
  silence.mockRestore();
});
