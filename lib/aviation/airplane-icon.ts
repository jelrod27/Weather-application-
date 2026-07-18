/**
 * Procedural top-down airplane icon for MapLibre symbols.
 * Drawn pointing north so icon-rotate can use ADS-B track degrees.
 * Solid yellow (FR24-style) with a dark outline — not SDF.
 */

export type AirplaneIconImage = {
  width: number;
  height: number;
  data: Uint8Array;
};

/** Max aircraft before callsign labels are restricted to the selection. */
export const AIRCRAFT_LABEL_DECLUTTER_COUNT = 60;

const YELLOW = { r: 234, g: 179, b: 8 };
const OUTLINE = { r: 15, g: 23, b: 42 };

function setPixel(
  data: Uint8Array,
  size: number,
  x: number,
  y: number,
  color: { r: number; g: number; b: number },
  alpha = 255,
): void {
  if (x < 0 || y < 0 || x >= size || y >= size) return;
  const i = (Math.floor(y) * size + Math.floor(x)) * 4;
  data[i] = color.r;
  data[i + 1] = color.g;
  data[i + 2] = color.b;
  data[i + 3] = alpha;
}

function fillTriangle(
  data: Uint8Array,
  size: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number,
  color: { r: number; g: number; b: number },
): void {
  const minX = Math.max(0, Math.floor(Math.min(ax, bx, cx)));
  const maxX = Math.min(size - 1, Math.ceil(Math.max(ax, bx, cx)));
  const minY = Math.max(0, Math.floor(Math.min(ay, by, cy)));
  const maxY = Math.min(size - 1, Math.ceil(Math.max(ay, by, cy)));
  const area = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
  if (area === 0) return;
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const w0 = ((bx - ax) * (y - ay) - (by - ay) * (x - ax)) / area;
      const w1 = ((cx - bx) * (y - by) - (cy - by) * (x - bx)) / area;
      const w2 = ((ax - cx) * (y - cy) - (ay - cy) * (x - cx)) / area;
      if (w0 >= 0 && w1 >= 0 && w2 >= 0) setPixel(data, size, x, y, color);
    }
  }
}

function strokeDisk(
  data: Uint8Array,
  size: number,
  cx: number,
  cy: number,
  radius: number,
  color: { r: number; g: number; b: number },
): void {
  const r2 = radius * radius;
  const outer = (radius + 1.1) * (radius + 1.1);
  for (let y = Math.floor(cy - radius - 2); y <= cy + radius + 2; y++) {
    for (let x = Math.floor(cx - radius - 2); x <= cx + radius + 2; x++) {
      const d = (x - cx) * (x - cx) + (y - cy) * (y - cy);
      if (d >= r2 && d <= outer) setPixel(data, size, x, y, color);
    }
  }
}

export function createAirplaneIcon(size = 64): AirplaneIconImage {
  const data = new Uint8Array(size * size * 4);
  const s = size;

  // Outline first (slightly expanded silhouette), then yellow fill.
  const inflate = s * 0.02;
  fillTriangle(
    data, s,
    s * 0.5, s * 0.06,
    s * 0.4 - inflate, s * 0.8,
    s * 0.6 + inflate, s * 0.8,
    OUTLINE,
  );
  fillTriangle(
    data, s,
    s * 0.5, s * 0.38,
    s * 0.05, s * 0.6,
    s * 0.5, s * 0.66,
    OUTLINE,
  );
  fillTriangle(
    data, s,
    s * 0.5, s * 0.38,
    s * 0.95, s * 0.6,
    s * 0.5, s * 0.66,
    OUTLINE,
  );
  fillTriangle(
    data, s,
    s * 0.5, s * 0.7,
    s * 0.26, s * 0.88,
    s * 0.74, s * 0.88,
    OUTLINE,
  );

  // Yellow body
  fillTriangle(data, s, s * 0.5, s * 0.1, s * 0.43, s * 0.76, s * 0.57, s * 0.76, YELLOW);
  fillTriangle(data, s, s * 0.5, s * 0.1, s * 0.46, s * 0.52, s * 0.54, s * 0.52, YELLOW);
  fillTriangle(data, s, s * 0.5, s * 0.4, s * 0.1, s * 0.58, s * 0.5, s * 0.62, YELLOW);
  fillTriangle(data, s, s * 0.5, s * 0.4, s * 0.9, s * 0.58, s * 0.5, s * 0.62, YELLOW);
  fillTriangle(data, s, s * 0.5, s * 0.72, s * 0.3, s * 0.86, s * 0.7, s * 0.86, YELLOW);
  fillTriangle(data, s, s * 0.5, s * 0.7, s * 0.47, s * 0.9, s * 0.53, s * 0.9, YELLOW);

  // Tiny nose accent so orientation reads at small sizes
  strokeDisk(data, s, s * 0.5, s * 0.18, s * 0.03, OUTLINE);

  return { width: size, height: size, data };
}
