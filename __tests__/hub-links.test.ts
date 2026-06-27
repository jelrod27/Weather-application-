import {
  findAlertByQueryParam,
  getHubAlertsHref,
  getHubHeadlineHref,
  getHubStargazerHref,
  isExternalHubHref,
} from '@/lib/home/hub-links';

describe('hub-links', () => {
  it('builds warnings deep links with alert id', () => {
    expect(getHubAlertsHref('urn:oid:abc123')).toBe('/warnings?alert=urn%3Aoid%3Aabc123');
    expect(getHubAlertsHref(null)).toBe('/warnings');
  });

  it('uses external headline urls for severe alerts', () => {
    expect(
      getHubHeadlineHref({
        category: 'severe',
        url: 'https://forecast.weather.gov/product.php?site=NWS&issuedby=LUB&product=SVR',
      }),
    ).toBe('https://forecast.weather.gov/product.php?site=NWS&issuedby=LUB&product=SVR');
  });

  it('falls back to warnings for severe headlines without urls', () => {
    expect(getHubHeadlineHref({ category: 'severe', url: null })).toBe('/warnings');
  });

  it('falls back to news for non-severe headlines without urls', () => {
    expect(getHubHeadlineHref({ category: 'space', url: null })).toBe('/news');
  });

  it('builds stargazer links with coordinates and city label', () => {
    expect(
      getHubStargazerHref({
        lat: 33.5779,
        lon: -101.8552,
        locationLabel: 'Lubbock, TX',
        country: 'US',
      }),
    ).toBe('/stargazer?lat=33.5779&lon=-101.8552&q=Lubbock%2C+TX');
  });

  it('detects external hrefs', () => {
    expect(isExternalHubHref('https://forecast.weather.gov/')).toBe(true);
    expect(isExternalHubHref('/warnings')).toBe(false);
  });

  it('matches alert query params to loaded alerts', () => {
    const alerts = [{ id: 'https://api.weather.gov/alerts/urn:oid:abc' }];
    expect(findAlertByQueryParam(alerts, 'https://api.weather.gov/alerts/urn:oid:abc')).toBe(
      alerts[0].id,
    );
  });
});
