/**
 * E2E spec for /aviation live tracker + demoted detail console.
 */

import { test, expect } from './fixtures';
import { setTheme } from '../fixtures/utils';

const SAMPLE_ALERTS = {
  alerts: [
    {
      id: 'sigmet-1',
      type: 'SIGMET',
      severity: 'severe',
      hazard: 'TURB',
      region: 'CONUS-CENTRAL',
      validFrom: '2026-05-07T12:00:00Z',
      validTo: '2026-05-07T18:00:00Z',
      text: 'Severe turbulence FL280-FL400 over central plains.',
    },
    {
      id: 'airmet-1',
      type: 'AIRMET',
      severity: 'moderate',
      hazard: 'TURB',
      region: 'CONUS-WEST',
      validFrom: '2026-05-07T10:00:00Z',
      validTo: '2026-05-07T16:00:00Z',
      text: 'Moderate turbulence below FL180.',
    },
  ],
};

const SAMPLE_PIREPS = {
  success: true,
  data: {
    pireps: [
      {
        id: 'pirep-1',
        receiptTime: '2026-05-07T14:30:00Z',
        observationTime: '2026-05-07T14:25:00Z',
        aircraftRef: 'B738',
        latitude: 40.0,
        longitude: -100.0,
        altitudeFt: 35000,
        turbulenceType: 'CAT',
        turbulenceIntensity: 'MOD',
        turbulenceBaseFt: 33000,
        turbulenceTopFt: 37000,
        icingType: null,
        icingIntensity: null,
        icingBaseFt: null,
        icingTopFt: null,
        tempC: -50,
        windDir: 270,
        windSpeedKt: 80,
        reportType: 'PIREP',
        rawText: 'B738 /OV BOI /TM 1425 /FL350 /TP B738 /TB MOD CAT',
      },
    ],
    fetchedAt: '2026-05-07T14:30:00Z',
  },
};

const SAMPLE_TURBULENCE = {
  success: true,
  data: {
    polygons: [
      {
        id: 'gairmet-0-0',
        coordinates: [[
          [-110, 35],
          [-95, 35],
          [-95, 45],
          [-110, 45],
          [-110, 35],
        ]],
        severity: 'moderate',
        rawSeverity: 'MOD',
        hazard: 'TURB',
        forecastHour: 0,
        validFrom: '2026-05-07T12:00:00Z',
        validTo: '2026-05-07T15:00:00Z',
        topFt: 35000,
        baseFt: 18000,
      },
    ],
    fetchedAt: '2026-05-07T14:30:00Z',
    source: 'NOAA AWC G-AIRMET',
    coverage: 'CONUS+AK+HI',
  },
};

const SAMPLE_AIRCRAFT = {
  aircraft: [
    {
      icao24: 'a12a7b',
      callsign: 'UAL2096',
      registration: 'N17401',
      typeCode: 'B39M',
      lat: 34.25,
      lon: -118.89,
      altitudeFt: 14000,
      groundSpeedKt: 340,
      trackDeg: 140,
      verticalRateFpm: -2000,
      squawk: '3276',
      seenSec: 0.2,
      source: 'adsb.lol',
    },
  ],
  source: 'adsb.lol',
  degraded: false,
  count: 1,
  fetchedAt: Date.now(),
  radiusNm: 100,
};

test.describe('/aviation', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/aviation/alerts**', (route) =>
      route.fulfill({ status: 200, body: JSON.stringify(SAMPLE_ALERTS) }),
    );
    await page.route('**/api/aviation/pireps**', (route) =>
      route.fulfill({ status: 200, body: JSON.stringify(SAMPLE_PIREPS) }),
    );
    await page.route('**/api/aviation/turbulence**', (route) =>
      route.fulfill({ status: 200, body: JSON.stringify(SAMPLE_TURBULENCE) }),
    );
    await page.route('**/api/aviation/aircraft/callsign**', (route) =>
      route.fulfill({ status: 200, body: JSON.stringify(SAMPLE_AIRCRAFT) }),
    );
    await page.route(/\/api\/aviation\/aircraft\?/, (route) =>
      route.fulfill({ status: 200, body: JSON.stringify(SAMPLE_AIRCRAFT) }),
    );
    await page.route('**/api/aviation/aircraft/route**', (route) =>
      route.fulfill({
        status: 200,
        body: JSON.stringify({ callsign: 'UAL2096', origin: 'KLAX', destination: 'KDEN', raw: {} }),
      }),
    );
    await page.route('**/api/aviation/aircraft/photo**', (route) =>
      route.fulfill({ status: 200, body: JSON.stringify({ photos: [] }) }),
    );
    await page.route('**/api/aviation/flight-brief**', (route) =>
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          level: 'low',
          summary: 'Low weather concern for this route based on current METAR and advisories.',
          score: 0,
          origin: { iata: 'LAX', icao: 'KLAX', category: 'VFR', metar: null },
          destination: { iata: 'DEN', icao: 'KDEN', category: 'VFR', metar: null },
          drivers: [{ id: 'clear', title: 'No major weather drivers flagged', detail: 'VFR' }],
          hazards: [],
          validUntil: new Date().toISOString(),
          disclaimer: 'Educational weather context only',
        }),
      }),
    );
    // OpenFreeMap tiles / MapLibre style — don't fail the page if tiles are slow
    await page.route('**/tiles.openfreemap.org/**', (route) => route.abort());
  });

  test('renders live tracker hero, map, and search', async ({ page }) => {
    await page.goto('/aviation', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { name: /LIVE FLIGHT TRACKER/i })).toBeVisible();
    await expect(page.getByTestId('aircraft-search')).toBeVisible();
    await expect(page.getByTestId('live-aircraft-map')).toBeVisible({ timeout: 30000 });
    await expect(page.getByTestId('aircraft-count-chip')).toBeVisible();
    await expect(page.getByTestId('flight-weather-brief')).toBeVisible();
  });

  test('deep link ?flight= selects aircraft and opens panel', async ({ page }) => {
    const callsignPromise = page.waitForResponse(
      (res) => res.url().includes('/api/aviation/aircraft/callsign') && res.ok(),
    );
    await page.goto('/aviation?flight=UAL2096', { waitUntil: 'domcontentloaded' });
    await callsignPromise;

    await expect(page.getByTestId('aircraft-selection-panel')).toBeVisible({ timeout: 20000 });
    await expect(page.getByTestId('aircraft-selection-panel').getByText('UAL2096')).toBeVisible();
  });

  test('detail console reveals flight lookup demo badge', async ({ page }) => {
    await page.goto('/aviation', { waitUntil: 'domcontentloaded' });

    await page.getByRole('button', { name: /detail console/i }).click();

    const routeButton = page.getByRole('button', { name: /Flight Route Lookup/i });
    await routeButton.waitFor({ state: 'visible', timeout: 30000 });
    await routeButton.click();

    try {
      await expect(routeButton).toHaveAttribute('aria-expanded', 'true', { timeout: 5000 });
    } catch {
      await routeButton.click();
      await expect(routeButton).toHaveAttribute('aria-expanded', 'true', { timeout: 10000 });
    }

    const flightInput = page.getByTestId('flight-number-input');
    await expect(flightInput).toBeVisible({ timeout: 30000 });
    await flightInput.fill('AA123');
    await page.getByTestId('flight-search-button').click();
    await expect(page.getByText(/Demo data/i)).toBeVisible({ timeout: 15000 });
  });

  test('detail console turbulence map mounts with OpenLayers viewport', async ({ page }) => {
    await page.goto('/aviation', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: /detail console/i }).click();

    const mapRegion = page.getByRole('region', {
      name: /Turbulence pilot reports map/i,
    });
    await expect(mapRegion).toBeVisible({ timeout: 15000 });
    await expect(mapRegion.locator('.ol-viewport')).toBeVisible({ timeout: 15000 });
  });

  test('theme tokens cascade to aviation surface', async ({ page }) => {
    await page.goto('/aviation', { waitUntil: 'domcontentloaded' });
    await setTheme(page, 'nord');

    const dataTheme = await page.locator('html').getAttribute('data-theme');
    expect(dataTheme).toBe('nord');

    const severityValue = await page.evaluate(() => {
      return getComputedStyle(document.documentElement)
        .getPropertyValue('--severity-extreme')
        .trim();
    });
    expect(severityValue.length).toBeGreaterThan(0);
  });
});
