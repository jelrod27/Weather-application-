import {
  AIRCRAFT_LABEL_DECLUTTER_COUNT,
  createAirplaneIcon,
} from '@/lib/aviation/airplane-icon';

describe('createAirplaneIcon', () => {
  it('renders a non-empty SDF-ready bitmap', () => {
    const icon = createAirplaneIcon(32);
    expect(icon.width).toBe(32);
    expect(icon.height).toBe(32);
    expect(icon.data.length).toBe(32 * 32 * 4);
    let opaque = 0;
    let yellow = 0;
    for (let i = 0; i < icon.data.length; i += 4) {
      if ((icon.data[i + 3] ?? 0) > 0) {
        opaque += 1;
        // FR24-style yellow fill
        if ((icon.data[i] ?? 0) > 200 && (icon.data[i + 1] ?? 0) > 150) yellow += 1;
      }
    }
    expect(opaque).toBeGreaterThan(20);
    expect(yellow).toBeGreaterThan(10);
  });

  it('exports a FR24-like label declutter threshold', () => {
    expect(AIRCRAFT_LABEL_DECLUTTER_COUNT).toBe(60);
  });
});
