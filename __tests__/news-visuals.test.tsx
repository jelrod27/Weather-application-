import React from 'react';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fireEvent, render, screen } from '@testing-library/react';
import NewsCard from '@/components/news/NewsCard';
import NewsHero from '@/components/news/NewsHero';
import { hazardFamily } from '@/lib/news/visuals';
import { spcOutlookImage } from '@/lib/news/spc-image';
import { parseAtomFeed, parseRSSFeed } from '@/lib/services/rss/parse-feed';
import { enrichItemImages } from '@/lib/services/rss/enrich-images';
import { FEED_SOURCES } from '@/lib/services/rss/feedSources';
import type { FeedSource } from '@/lib/services/rss/feedSources';
import type { RSSItem } from '@/lib/services/rss/parse-feed';

function source(id: string): FeedSource {
  const found = FEED_SOURCES.find((entry) => entry.id === id);
  if (!found) throw new Error(`Missing configured source: ${id}`);
  return found;
}
const fixture = (name: string): string => readFileSync(path.join(__dirname, 'fixtures/news', name), 'utf8');
const warnings = parseAtomFeed(fixture('nws-2026-10-11.xml'), source('nws-alerts'));
const outlooks = parseRSSFeed(fixture('spc-2026-10-11.xml'), source('spc-outlooks'));
const day2 = outlooks.find((item) => item.title.includes('Day 2'))!;
const freeze = warnings.find((item) => item.hazard?.event === 'Freeze Warning')!;

describe('hazard imagery provenance', () => {
  it('keeps the reported wind/freeze/flash-flood cases distinct without satellite or outlook stock', async () => {
    expect(warnings).toHaveLength(3);
    const items = await enrichItemImages(warnings);
    expect(items.map(hazardFamily)).toEqual(['wind', 'freeze', 'flash-flood']);
    expect(items.every((item) => !item.imageUrl && !item.image)).toBe(true);
    expect(freeze.location).toBeTruthy();
    expect(freeze.hazard?.expires).toMatch(/^2026-/);
  });

  it.each([
    ['Tornado Warning', 'tornado'], ['Severe Thunderstorm Warning', 'thunderstorm'],
    ['High Wind Warning', 'wind'], ['Freeze Warning', 'freeze'], ['Frost Advisory', 'freeze'],
    ['Flash Flood Warning', 'flash-flood'], ['Flood Warning', 'flood'], ['Red Flag Warning', 'fire'],
    ['Special Marine Warning', 'marine'], ['Winter Storm Warning', 'winter'], ['New Unknown Event', 'other'],
  ])('uses the structured %s type regardless of headline edits', (event, expected) => {
    expect(hazardFamily({ ...freeze, hazard: { event }, title: 'Convective outlook in a renamed town' })).toBe(expected);
  });

  it('does not guess a specific hazard from an unverified headline', () => {
    expect(hazardFamily({ category: 'severe' })).toBe('other');
  });

  it('replaces the moving Day 2 image with the matching archived issuance and validity', async () => {
    const [item] = await enrichItemImages([day2]);
    expect(item.imageUrl).toBe('https://www.spc.noaa.gov/products/outlook/archive/2026/day2otlk_20261011_1730_prt.png');
    expect(item.image).toMatchObject({ kind: 'product', issuedAt: '2026-10-11T17:30:00.000Z',
      validFrom: '2026-10-12T12:00:00.000Z', validUntil: '2026-10-13T12:00:00.000Z' });
  });

  it('rejects a publisher image on a warning, even when it arrived in the feed', async () => {
    const [item] = await enrichItemImages([{ ...freeze, imageUrl: day2.imageUrl, image: day2.image }]);
    expect(item.image).toBeUndefined();
    expect(item.imageUrl).toBeUndefined();
  });

  it('uses a tropical illustration for unverified NHC imagery instead of a basin map', async () => {
    const [item] = await enrichItemImages([{ ...freeze, sourceId: 'nhc-atlantic', category: 'hurricanes', hazard: undefined }]);
    expect(item.image).toBeUndefined();
    expect(hazardFamily(item)).toBe('tropical');
  });

  it('rejects mismatched SPC product identity and missing validity', () => {
    const input = { sourceId: 'spc-outlooks', url: day2.url, title: day2.title, body: 'Valid 121200Z - 131200Z' };
    expect(spcOutlookImage({ ...input, sourceId: 'nws-alerts' })).toBeUndefined();
    expect(spcOutlookImage({ ...input, url: day2.url.replace('day2', 'day1') })).toBeUndefined();
    expect(spcOutlookImage({ ...input, body: '' })).toBeUndefined();
    expect(spcOutlookImage({ ...input, body: 'Valid 321200Z - 331200Z' })).toBeUndefined();
  });

  it('handles a synthetic outlook crossing the year boundary', () => {
    const image = spcOutlookImage({ sourceId: 'spc-outlooks', url: day2.url,
      title: 'SPC Dec 31, 2026 1730 UTC Day 2 Convective Outlook', body: 'Valid 011200Z - 021200Z' });
    expect(image?.validFrom).toBe('2027-01-01T12:00:00.000Z');
    expect(image?.validUntil).toBe('2027-01-02T12:00:00.000Z');
  });

  it('carries an explicit publisher credit to the image', () => {
    const [item] = parseRSSFeed('<rss><channel><item><title>Research</title><link>https://www.nasa.gov/research</link>' +
      '<media:credit>NASA / Jane Researcher</media:credit><enclosure url="https://www.nasa.gov/image.jpg" type="image/jpeg" />' +
      '</item></channel></rss>', source('nasa-breaking'));
    expect(item.image?.credit).toBe('NASA / Jane Researcher');
  });

  it('preserves named-volcano reference context and rejects unknown peaks', async () => {
    const volcano = { ...freeze, category: 'volcanoes' as const, sourceId: 'usgs-volcanoes', hazard: undefined };
    const items = await enrichItemImages([{ ...volcano, location: 'Kilauea' }, { ...volcano, location: 'Great Sitkin' }]);
    expect(items[0].image).toMatchObject({ kind: 'reference', caption: expect.stringContaining('Not a current eruption image') });
    expect(items[1].image).toBeUndefined();
  });


});

describe.each(['default', 'compact', 'featured', 'hero'] as const)('%s visual surface', (variant) => {
  function surface(item: RSSItem): React.ReactElement {
    return variant === 'hero' ? <NewsHero item={item} /> : <NewsCard item={item} variant={variant} />;
  }

  it('renders a freeze illustration with location and authority timing', () => {
    render(surface(freeze));
    expect(screen.getByRole('img', { name: /freeze.*illustration/i })).toBeInTheDocument();
    expect(screen.getAllByText(freeze.location!).length).toBeGreaterThan(0);
    expect(screen.getByText(/Expires/)).toBeInTheDocument();
  });

  it('preserves the full map, attribution and validity, then falls back honestly on error', () => {
    render(surface(day2));
    const image = screen.getByRole('img', { name: /SPC Day 2/ });
    expect(image).toHaveClass('object-contain');
    expect(screen.getByRole('link', { name: 'NOAA / Storm Prediction Center' })).toHaveAttribute('href', day2.image!.sourceUrl);
    expect(screen.getByText(/^Valid/)).toBeInTheDocument();
    fireEvent.error(image);
    expect(screen.queryByRole('img', { name: /SPC Day 2/ })).not.toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Weather report illustration/ })).toBeInTheDocument();
    expect(screen.queryByText('NOAA / Storm Prediction Center')).not.toBeInTheDocument();
  });

  it('tries a new image after a failed image is replaced', () => {
    const view = render(surface(day2));
    fireEvent.error(screen.getByRole('img', { name: /SPC Day 2/ }));
    view.rerender(surface({ ...day2, image: { ...day2.image!, url: 'https://www.spc.noaa.gov/new.png' } }));
    expect(screen.getByRole('img', { name: /SPC Day 2/ })).toHaveAttribute('src', 'https://www.spc.noaa.gov/new.png');
  });

  it('does not open the article when the attribution link is activated', () => {
    const open = jest.spyOn(window, 'open').mockImplementation(() => null);
    render(surface(day2));
    const credit = screen.getByRole('link', { name: 'NOAA / Storm Prediction Center' });
    fireEvent.click(credit);
    fireEvent.keyDown(credit, { key: 'Enter' });
    expect(open).not.toHaveBeenCalled();
    open.mockRestore();
  });
});
