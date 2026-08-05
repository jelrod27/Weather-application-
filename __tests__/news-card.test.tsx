/**
 * Unit tests for NewsCard (default variant) interactivity.
 *
 * Pins the grid-card fixes: the whole card opens the article (it was only the
 * READ button before), the READ button does not open a second tab, and an
 * image that fails to load falls back to the text layout instead of leaving a
 * blank banner.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

jest.mock('@/components/theme-provider', () => ({
  useTheme: () => ({ theme: 'nord' }),
}));

jest.mock('@/lib/theme-utils', () => ({
  getComponentStyles: () => ({
    background: '',
    headerText: '',
    text: '',
    accentText: '',
    borderColor: '',
  }),
}));

import NewsCard from '@/components/news/NewsCard';
import type { RSSItem } from '@/lib/services/rss/rssAggregator';

function makeItem(overrides: Partial<RSSItem> = {}): RSSItem {
  return {
    id: 'src-1-1',
    title: 'Severe thunderstorm warning issued for the metro area',
    description: 'A line of storms is moving east.',
    url: 'https://example.com/article',
    source: 'Example News',
    sourceId: 'src',
    category: 'severe',
    priority: 'medium',
    timestamp: new Date(),
    imageUrl: 'https://cdn.example.com/a.jpg',
    ...overrides,
  } as RSSItem;
}

describe('NewsCard default variant', () => {
  let openSpy: jest.SpyInstance;

  beforeEach(() => {
    openSpy = jest.spyOn(window, 'open').mockImplementation(() => null);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('opens the article when the card body is clicked', () => {
    render(<NewsCard item={makeItem()} />);

    fireEvent.click(screen.getByRole('link'));

    expect(openSpy).toHaveBeenCalledTimes(1);
    expect(openSpy).toHaveBeenCalledWith('https://example.com/article', '_blank', 'noopener,noreferrer');
  });

  it('opens exactly once when the READ button is clicked (no double tab)', () => {
    render(<NewsCard item={makeItem()} />);

    fireEvent.click(screen.getByRole('button', { name: /read full article/i }));

    expect(openSpy).toHaveBeenCalledTimes(1);
  });

  it('is keyboard activatable as a link', () => {
    render(<NewsCard item={makeItem()} />);

    fireEvent.keyDown(screen.getByRole('link'), { key: 'Enter' });

    expect(openSpy).toHaveBeenCalledTimes(1);
  });

  it('falls back to the placeholder when the image fails to load', () => {
    render(<NewsCard item={makeItem()} />);

    const img = screen.getByAltText(/severe thunderstorm warning/i);
    fireEvent.error(img);

    // After an image error the <img> is removed and the card shows the
    // category placeholder banner instead, but stays a working link.
    expect(screen.queryByAltText(/severe thunderstorm warning/i)).toBeNull();
    expect(screen.getByRole('link')).toBeTruthy();
  });

  it('renders a placeholder (no <img>) for an imageless item but stays clickable', () => {
    render(<NewsCard item={makeItem({ imageUrl: undefined, category: 'earthquakes' })} />);

    expect(screen.queryByRole('img')).toBeNull();
    const link = screen.getByRole('link');
    fireEvent.click(link);
    expect(openSpy).toHaveBeenCalledTimes(1);
  });

  it('shows a data-forward magnitude banner for imageless earthquakes', () => {
    render(
      <NewsCard
        item={makeItem({
          imageUrl: undefined,
          category: 'earthquakes',
          title: 'M 5.1 - south of Tonga',
          magnitude: 5.1,
          depth: 10,
          location: 'south of Tonga',
        })}
      />,
    );

    const banner = screen.getByTestId('news-card-data-banner');
    expect(banner).toHaveTextContent('M5.1');
    expect(banner).toHaveTextContent('south of Tonga');
    expect(banner).toHaveTextContent('10.0 km depth');
    expect(banner).not.toHaveAttribute('aria-hidden', 'true');
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('keeps decorative category banners hidden from assistive tech', () => {
    render(<NewsCard item={makeItem({ imageUrl: undefined, category: 'severe' })} />);

    expect(screen.getByTestId('news-card-data-banner')).toHaveAttribute('aria-hidden', 'true');
  });
});
