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
    category: 'weather',
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

  it('falls back to the text layout when the image fails to load', () => {
    render(<NewsCard item={makeItem()} />);

    const img = screen.getByAltText(/severe thunderstorm warning/i);
    fireEvent.error(img);

    // After an image error the banner is gone and the inline priority
    // indicator (only shown without an image) appears.
    expect(screen.queryByAltText(/severe thunderstorm warning/i)).toBeNull();
  });
});
