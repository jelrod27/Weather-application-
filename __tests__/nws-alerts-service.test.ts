/**
 * Unit tests for NWS Alerts Service and Weather Intensity Score (WIS)
 */

import {
  calculateWIS,
  fetchAlertCounts,
  fetchActiveAlerts,
  getWISScore,
  harmWarningActiveAlertsUrl,
  nwsContinuationUrl,
  type AlertCounts,
} from '@/lib/services/nws-alerts-service';

describe('Weather Intensity Score (WIS)', () => {
  describe('calculateWIS', () => {
    it('should return score 0 and green level when no alerts are active', () => {
      const counts: AlertCounts = {
        total: 0,
        severity: { extreme: 0, severe: 0, moderate: 0, minor: 0 },
        urgency: { immediate: 0, expected: 0, future: 0 },
      };

      const result = calculateWIS(counts);

      expect(result.score).toBe(0);
      expect(result.level).toBe('green');
      expect(result.label).toBe('LOW');
      expect(result.totalAlerts).toBe(0);
    });

    it('should weight extreme alerts more heavily than minor alerts', () => {
      const extremeOnly: AlertCounts = {
        total: 10,
        severity: { extreme: 10, severe: 0, moderate: 0, minor: 0 },
        urgency: { immediate: 10, expected: 0, future: 0 },
      };
      const minorOnly: AlertCounts = {
        total: 10,
        severity: { extreme: 0, severe: 0, moderate: 0, minor: 10 },
        urgency: { immediate: 0, expected: 0, future: 10 },
      };

      expect(calculateWIS(extremeOnly).score).toBeGreaterThan(calculateWIS(minorOnly).score);
    });

    it('should cap score at 100', () => {
      const counts: AlertCounts = {
        total: 1000,
        severity: { extreme: 100, severe: 200, moderate: 300, minor: 400 },
        urgency: { immediate: 200, expected: 400, future: 400 },
      };

      expect(calculateWIS(counts).score).toBe(100);
    });

    it('should calculate activeWarnings from extreme + severe counts', () => {
      const counts: AlertCounts = {
        total: 30,
        severity: { extreme: 5, severe: 10, moderate: 8, minor: 7 },
        urgency: { immediate: 5, expected: 15, future: 10 },
      };

      const result = calculateWIS(counts);

      expect(result.activeWarnings).toBe(15);
      expect(result.activeWatches).toBe(8);
      expect(result.activeAdvisories).toBe(7);
      expect(result.totalAlerts).toBe(30);
      expect(result.nwsWarnings).toBe(0);
      expect(result.nwsWatches).toBe(0);
      expect(result.nwsAdvisories).toBe(0);
    });
  });

  describe('fetchAlertCounts', () => {
    it('should return empty counts when API fails', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      const result = await fetchAlertCounts();

      expect(result.total).toBe(0);
      expect(result.severity.extreme).toBe(0);
    });

    it('should count alerts by severity from the full alerts response', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          type: 'FeatureCollection',
          features: [
            { type: 'Feature', geometry: null, properties: { id: '1', headline: '', event: '', severity: 'Extreme', urgency: 'Immediate', expires: '', areaDesc: '' } },
            { type: 'Feature', geometry: null, properties: { id: '2', headline: '', event: '', severity: 'Severe', urgency: 'Expected', expires: '', areaDesc: '' } },
            { type: 'Feature', geometry: null, properties: { id: '3', headline: '', event: '', severity: 'Moderate', urgency: 'Expected', expires: '', areaDesc: '' } },
            { type: 'Feature', geometry: null, properties: { id: '4', headline: '', event: '', severity: 'Minor', urgency: 'Future', expires: '', areaDesc: '' } },
            { type: 'Feature', geometry: null, properties: { id: '5', headline: '', event: '', severity: 'Minor', urgency: 'Future', expires: '', areaDesc: '' } },
          ]
        }),
      });

      const result = await fetchAlertCounts();

      expect(result.total).toBe(5);
      expect(result.severity.extreme).toBe(1);
      expect(result.severity.severe).toBe(1);
      expect(result.severity.moderate).toBe(1);
      expect(result.severity.minor).toBe(2);
    });
  });

  describe('getWISScore', () => {
    it('should return a WISScore when API fails', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      const result = await getWISScore();

      expect(result.score).toBe(0);
      expect(result.level).toBe('green');
    });

    it('should count NWS warning products from event text', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              geometry: null,
              properties: {
                id: 'w1',
                headline: 'Severe Thunderstorm Warning',
                event: 'Severe Thunderstorm Warning',
                severity: 'Severe',
                urgency: 'Immediate',
                expires: '2099-01-01T00:00:00Z',
                areaDesc: 'Test',
                sent: '',
                effective: '',
                ends: '',
                description: '',
                instruction: '',
                certainty: '',
                response: '',
                sender: '',
              },
            },
            {
              type: 'Feature',
              geometry: null,
              properties: {
                id: 'w2',
                headline: 'Severe Thunderstorm Watch',
                event: 'Severe Thunderstorm Watch',
                severity: 'Moderate',
                urgency: 'Expected',
                expires: '2099-01-01T00:00:00Z',
                areaDesc: 'Test',
                sent: '',
                effective: '',
                ends: '',
                description: '',
                instruction: '',
                certainty: '',
                response: '',
                sender: '',
              },
            },
          ],
        }),
      });

      const result = await getWISScore();
      expect(result.nwsWarnings).toBe(1);
      expect(result.nwsWatches).toBe(1);
      expect(result.nwsAdvisories).toBe(0);
    });
  });

  describe('fetchActiveAlerts', () => {
    it('should return empty array when API fails', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      const result = await fetchActiveAlerts();

      expect(result).toEqual([]);
    });

    it('should parse alerts from NWS GeoJSON response', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          type: 'FeatureCollection',
          features: [{
            type: 'Feature',
            geometry: null,
            properties: {
              id: 'urn:oid:123',
              headline: 'Tornado Warning',
              event: 'Tornado Warning',
              severity: 'Extreme',
              urgency: 'Immediate',
              expires: '2026-03-22T20:00:00Z',
              areaDesc: 'Oklahoma County, OK',
            }
          }]
        }),
      });

      const result = await fetchActiveAlerts();

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('headline', 'Tornado Warning');
      expect(result[0]).toHaveProperty('severity', 'Extreme');
      expect(result[0]).toHaveProperty('areaDesc', 'Oklahoma County, OK');
    });

    it('should default unknown severity values to Minor', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          type: 'FeatureCollection',
          features: [{
            type: 'Feature',
            geometry: null,
            properties: {
              id: '1', headline: '', event: '',
              severity: 'Unknown',
              urgency: '', expires: '', areaDesc: '',
            }
          }]
        }),
      });

      const result = await fetchActiveAlerts();

      expect(result[0]).toHaveProperty('severity', 'Minor');
    });
  });
});

describe('harmWarningActiveAlertsUrl', () => {
  it('requests only tornado, severe thunderstorm, and flash flood warnings', () => {
    const url = harmWarningActiveAlertsUrl()
    expect(url).toContain('api.weather.gov/alerts/active')
    expect(url).toContain('Tornado%20Warning')
    expect(url).toContain('Severe%20Thunderstorm%20Warning')
    expect(url).toContain('Flash%20Flood%20Warning')
    expect(url).not.toContain('Watch')
  })
})

describe('nwsContinuationUrl', () => {
  it('accepts https api.weather.gov URLs without an explicit port', () => {
    expect(nwsContinuationUrl('https://api.weather.gov/alerts?cursor=1')).toBe(
      'https://api.weather.gov/alerts?cursor=1',
    )
  })

  it('rejects an external host, credentials, and a non-default port', () => {
    expect(nwsContinuationUrl('https://evil.example/alerts')).toBeNull()
    expect(nwsContinuationUrl('https://user:pass@api.weather.gov/alerts')).toBeNull()
    expect(nwsContinuationUrl('https://api.weather.gov:8443/alerts')).toBeNull()
    expect(nwsContinuationUrl('http://api.weather.gov/alerts')).toBeNull()
  })
})
