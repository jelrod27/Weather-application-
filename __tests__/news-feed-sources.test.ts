import { FEED_SOURCES, getEnabledSourceNames } from '@/lib/services/rss/feedSources';

describe('volcano news sources', () => {
  it('keeps the 403 Smithsonian feed out of requests while retaining USGS alerts', () => {
    const smithsonian = FEED_SOURCES.find((source) => source.id === 'smithsonian-volcanoes');
    const usgs = FEED_SOURCES.find((source) => source.id === 'usgs-volcanoes');

    expect(smithsonian?.enabled).toBe(false);
    expect(usgs?.enabled).toBe(true);
    expect(getEnabledSourceNames()).not.toContain('Smithsonian Global Volcanism');
    expect(getEnabledSourceNames()).toContain('USGS Volcano Alerts');
  });
});
