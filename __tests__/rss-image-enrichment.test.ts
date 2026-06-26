import { parseOgImageFromHtml, shouldAttemptOgImage } from '@/lib/services/rss/resolve-og-image';
import { getCategoryStockImage } from '@/lib/news/stock-images';
import { __testing } from '@/lib/services/rss/rssAggregator';

const { parseRSSFeed } = __testing;

describe('parseOgImageFromHtml', () => {
  it('extracts og:image and rejects generic mastheads', () => {
    const html = `
      <meta property="og:image" content="https://images-assets.nasa.gov/image/test/test~large.jpg" />
    `;
    expect(parseOgImageFromHtml(html, 'https://www.nasa.gov/article')).toBe(
      'https://images-assets.nasa.gov/image/test/test~large.jpg',
    );

    const masthead = `<meta property="og:image" content="https://www.carbonbrief.org/wp-content/uploads/website-masthead-new.png" />`;
    expect(parseOgImageFromHtml(masthead, 'https://www.carbonbrief.org/story')).toBeNull();
  });
});

describe('shouldAttemptOgImage', () => {
  it('skips NWS text product pages', () => {
    expect(
      shouldAttemptOgImage(
        'https://forecast.weather.gov/product.php?site=NWS&issuedby=ABQ&product=RFW&format=CI&version=1',
      ),
    ).toBe(false);
  });

  it('allows NASA science articles', () => {
    expect(shouldAttemptOgImage('https://science.nasa.gov/missions/swift/article/')).toBe(true);
  });
});

describe('parseRSSFeed image extraction', () => {
  it('pulls images from content:encoded when description is short', () => {
    const xml = `<?xml version="1.0"?>
      <rss version="2.0"><channel><title>T</title>
        <item>
          <title>Launch preview</title>
          <link>https://science.nasa.gov/example</link>
          <description>Short teaser without an image.</description>
          <content:encoded><![CDATA[
            <p>Body</p>
            <img src="https://assets.science.nasa.gov/dynamicimage/assets/example.jpg?w=1200" />
          ]]></content:encoded>
        </item>
      </channel></rss>`;

    const items = parseRSSFeed(xml, {
      id: 'nasa-breaking',
      name: 'NASA',
      url: 'https://example.com/feed',
      category: 'space',
      priority: 'high',
      enabled: true,
      format: 'rss',
      refreshInterval: 30,
    });

    expect(items[0]?.imageUrl).toContain('assets.science.nasa.gov');
  });
});

describe('category stock images', () => {
  it('provides a fallback image for every category', () => {
    for (const category of [
      'severe',
      'hurricanes',
      'earthquakes',
      'volcanoes',
      'space',
      'climate',
      'science',
    ] as const) {
      expect(getCategoryStockImage(category).url).toMatch(/^https:\/\//);
    }
  });
});
