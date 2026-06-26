import { parseOgImageFromHtml, shouldAttemptOgImage } from '@/lib/services/rss/resolve-og-image';
import {
  getCategoryStockImage,
  pickSevereStockImage,
  pickTropicalStockImage,
  pickVolcanoStockImage,
  resolveNhcOutlookImage,
  resolveNwsAlertImage,
  SEVERE_STOCK_POOL,
  TROPICAL_STOCK_POOL,
  VOLCANO_STOCK_POOL,
} from '@/lib/news/stock-images';
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

  it('assigns different volcano stock art per peak name', () => {
    const greatSitkin = pickVolcanoStockImage('Great Sitkin');
    const kupreanof = pickVolcanoStockImage('Kupreanof');
    const kilauea = pickVolcanoStockImage('Kilauea');

    expect(greatSitkin.url).not.toBe(kupreanof.url);
    expect(kilauea.url).toContain('Puu_Oo');
    expect(VOLCANO_STOCK_POOL.length).toBeGreaterThanOrEqual(6);
  });

  it('maps NHC outlook titles to basin-specific graphics', () => {
    expect(
      resolveNhcOutlookImage({
        title: 'Atlantic Tropical Weather Outlook',
        url: 'https://www.nhc.noaa.gov/gtwo.php?basin=atlc',
        sourceId: 'nhc-atlantic',
      }),
    ).toContain('xgtwo_atl_2d0');

    expect(
      resolveNhcOutlookImage({
        title: 'Eastern North Pacific Tropical Weather Outlook',
        url: 'https://www.nhc.noaa.gov/gtwo.php?basin=epac',
        sourceId: 'nhc-pacific',
      }),
    ).toContain('xgtwo_pac_2d0');

    expect(
      resolveNhcOutlookImage({
        title: 'There are no tropical cyclones at this time.',
        url: 'https://www.nhc.noaa.gov/',
        sourceId: 'nhc-pacific',
      }),
    ).toContain('xgtwo_pac_7d0');
  });

  it('varies tropical stock art by outlook vs calm basin', () => {
    const atlantic = pickTropicalStockImage('Atlantic Tropical Weather Outlook', 'nhc-atlantic');
    const pacific = pickTropicalStockImage('Eastern North Pacific Tropical Weather Outlook', 'nhc-pacific');
    const calmAtl = pickTropicalStockImage('There are no tropical cyclones at this time.', 'nhc-atlantic');

    expect(atlantic.url).toContain('xgtwo_atl_2d0');
    expect(pacific.url).toContain('xgtwo_pac_2d0');
    expect(calmAtl.url).not.toBe(atlantic.url);
    expect(TROPICAL_STOCK_POOL.length).toBeGreaterThanOrEqual(6);
  });

  it('maps NWS alert types to hazard-appropriate imagery pools', () => {
    const flood = resolveNwsAlertImage({
      title: 'Flood Warning issued June 26 at 2:56PM CDT until June 26 at 5:00PM CDT by NWS Wichita KS',
    });
    const thunder = resolveNwsAlertImage({
      title: 'Severe Thunderstorm Warning issued June 26 at 1:56PM MDT until June 26 at 2:30PM MDT by NWS Denver CO',
    });
    const redFlag = resolveNwsAlertImage({
      title: 'Red Flag Warning issued June 26 at 12:44PM PDT until June 27 at 9:00PM PDT by NWS Medford OR',
    });

    expect(flood).toMatch(/CONUS|day2otlk|FD\/GEOCOLOR/);
    expect(thunder).toMatch(/CONUS\/(13|14|GEOCOLOR)/);
    expect(redFlag).toMatch(/CONUS|FD\/GEOCOLOR/);
    const tornado = resolveNwsAlertImage({
      title: 'Tornado Warning issued June 26 at 3:00PM CDT until June 26 at 3:45PM CDT by NWS Norman OK',
    });
    expect(flood).not.toBe(tornado);
    expect(SEVERE_STOCK_POOL.length).toBeGreaterThanOrEqual(6);
  });

  it('varies severe stock art by alert title hash', () => {
    const floodA = pickSevereStockImage(
      'Flood Warning issued June 26 at 2:56PM CDT until June 26 at 5:00PM CDT by NWS Wichita KS',
      'nws-alerts',
    );
    const floodB = pickSevereStockImage(
      'Flood Warning issued June 26 at 2:53PM CDT until July 2 at 8:00PM CDT by NWS Topeka KS',
      'nws-alerts',
    );

    expect(floodA.url).not.toBe(floodB.url);
  });
});
