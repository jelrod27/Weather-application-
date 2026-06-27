import { pointInGeoJsonGeometry } from '@/lib/geo/point-in-polygon';
import { getHighestSpcRiskAtPoint } from '@/lib/geo/spc-point-risk';
import type { SPCOutlookGeoJSON } from '@/lib/services/spc-outlook-service';

describe('point-in-polygon', () => {
  it('detects a point inside a polygon', () => {
    const inside = pointInGeoJsonGeometry([-74, 40], {
      type: 'Polygon',
      coordinates: [[[-75, 39], [-73, 39], [-73, 41], [-75, 41], [-75, 39]]],
    });
    expect(inside).toBe(true);
  });

  it('detects a point outside a polygon', () => {
    const inside = pointInGeoJsonGeometry([-80, 40], {
      type: 'Polygon',
      coordinates: [[[-75, 39], [-73, 39], [-73, 41], [-75, 41], [-75, 39]]],
    });
    expect(inside).toBe(false);
  });
});

describe('spc-point-risk', () => {
  const geojson: SPCOutlookGeoJSON = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [[[-75, 39], [-73, 39], [-73, 41], [-75, 41], [-75, 39]]],
        },
        properties: {
          DN: 1,
          VALID: '',
          EXPIRE: '',
          ISSUE: '',
          VALID_ISO: '',
          EXPIRE_ISO: '',
          ISSUE_ISO: '',
          FORECASTER: '',
          LABEL: 'SLGT',
          LABEL2: 'Slight Risk',
          stroke: '#000',
          fill: '#FFE066',
        },
      },
    ],
  };

  it('returns the highest risk polygon containing the point', () => {
    expect(getHighestSpcRiskAtPoint(geojson, 40, -74)).toEqual({
      riskCode: 'SLGT',
      label: 'Slight',
      fill: '#FFE066',
    });
  });

  it('returns null when the point is outside all risk areas', () => {
    expect(getHighestSpcRiskAtPoint(geojson, 40, -80)).toBeNull();
  });
});
