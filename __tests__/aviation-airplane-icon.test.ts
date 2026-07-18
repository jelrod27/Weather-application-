import {
  AIRCRAFT_LABEL_DECLUTTER_COUNT,
  PLANE_MARKER_SVG_PATH,
  createAirplaneIcon,
} from '@/lib/aviation/airplane-icon';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('createAirplaneIcon', () => {
  it('renders a non-empty high-res bitmap fallback', () => {
    const icon = createAirplaneIcon(128);
    expect(icon.width).toBe(128);
    expect(icon.height).toBe(128);
    expect(icon.data.length).toBe(128 * 128 * 4);
    let opaque = 0;
    let yellow = 0;
    for (let i = 0; i < icon.data.length; i += 4) {
      if ((icon.data[i + 3] ?? 0) > 0) {
        opaque += 1;
        if ((icon.data[i] ?? 0) > 200 && (icon.data[i + 1] ?? 0) > 150) yellow += 1;
      }
    }
    expect(opaque).toBeGreaterThan(80);
    expect(yellow).toBeGreaterThan(40);
  });

  it('ships a crisp SVG marker asset for browser rasterization', () => {
    expect(PLANE_MARKER_SVG_PATH).toBe('/aviation/plane-marker.svg');
    const svg = readFileSync(
      join(__dirname, '..', 'public', 'aviation', 'plane-marker.svg'),
      'utf-8',
    );
    expect(svg).toContain('viewBox="0 0 64 64"');
    expect(svg).toContain('#eab308');
    expect(svg).toContain('Top-down jet');
  });

  it('exports a FR24-like label declutter threshold', () => {
    expect(AIRCRAFT_LABEL_DECLUTTER_COUNT).toBe(60);
  });
});
