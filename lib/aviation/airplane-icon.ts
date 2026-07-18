/**
 * Airplane map marker for MapLibre.
 * Prefer the crisp SVG in /public/aviation/plane-marker.svg (browser).
 * Procedural fallback keeps Jest / non-DOM environments working.
 *
 * Note: shadcn/Lucide Plane is a side-view UI icon — wrong orientation for
 * track-rotated map markers, so we use a dedicated top-down asset.
 */

export type AirplaneIconImage = {
  width: number;
  height: number;
  data: Uint8Array;
};

/** Max aircraft before callsign labels are restricted to the selection. */
export const AIRCRAFT_LABEL_DECLUTTER_COUNT = 60;

export const PLANE_MARKER_SVG_PATH = '/aviation/plane-marker.svg';

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
  // Keep the strongest (most opaque) sample when supersampling.
  if ((data[i + 3] ?? 0) > alpha) return;
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
  alpha = 255,
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
      if (w0 >= 0 && w1 >= 0 && w2 >= 0) setPixel(data, size, x, y, color, alpha);
    }
  }
}

/** Sync procedural icon (tests + fallback). */
export function createAirplaneIcon(size = 128): AirplaneIconImage {
  const data = new Uint8Array(size * size * 4);
  const s = size;
  const inflate = s * 0.03;

  // Soft outline (slightly larger, partial alpha) then solid fill — reads sharper when scaled down.
  fillTriangle(data, s, s * 0.5, s * 0.05, s * 0.38 - inflate, s * 0.82, s * 0.62 + inflate, s * 0.82, OUTLINE, 220);
  fillTriangle(data, s, s * 0.5, s * 0.36, s * 0.04, s * 0.58, s * 0.5, s * 0.66, OUTLINE, 220);
  fillTriangle(data, s, s * 0.5, s * 0.36, s * 0.96, s * 0.58, s * 0.5, s * 0.66, OUTLINE, 220);
  fillTriangle(data, s, s * 0.5, s * 0.68, s * 0.24, s * 0.9, s * 0.76, s * 0.9, OUTLINE, 220);

  fillTriangle(data, s, s * 0.5, s * 0.08, s * 0.42, s * 0.78, s * 0.58, s * 0.78, YELLOW);
  fillTriangle(data, s, s * 0.5, s * 0.08, s * 0.46, s * 0.5, s * 0.54, s * 0.5, YELLOW);
  fillTriangle(data, s, s * 0.5, s * 0.38, s * 0.08, s * 0.56, s * 0.5, s * 0.62, YELLOW);
  fillTriangle(data, s, s * 0.5, s * 0.38, s * 0.92, s * 0.56, s * 0.5, s * 0.62, YELLOW);
  fillTriangle(data, s, s * 0.5, s * 0.7, s * 0.28, s * 0.88, s * 0.72, s * 0.88, YELLOW);
  fillTriangle(data, s, s * 0.5, s * 0.68, s * 0.46, s * 0.92, s * 0.54, s * 0.92, YELLOW);

  return { width: size, height: size, data };
}

function imageDataFromCanvas(
  canvas: HTMLCanvasElement,
): AirplaneIconImage {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas 2D unavailable for airplane icon');
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return {
    width: canvas.width,
    height: canvas.height,
    data: new Uint8Array(imageData.data.buffer.slice(0)),
  };
}

/**
 * Load the SVG marker and rasterize at high DPI for sharp MapLibre symbols.
 * Falls back to the procedural icon if the asset cannot be drawn.
 */
export async function loadAirplaneIcon(
  size = 128,
  src: string = PLANE_MARKER_SVG_PATH,
): Promise<AirplaneIconImage> {
  if (typeof document === 'undefined' || typeof Image === 'undefined') {
    return createAirplaneIcon(size);
  }

  try {
    const img = new Image();
    img.decoding = 'async';
    const loaded = new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error(`Failed to load ${src}`));
    });
    img.src = src;
    await loaded;

    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return createAirplaneIcon(size);

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.clearRect(0, 0, size, size);
    ctx.drawImage(img, 0, 0, size, size);
    return imageDataFromCanvas(canvas);
  } catch {
    return createAirplaneIcon(size);
  }
}
