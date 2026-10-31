/** Colors derived from album art: a dark backdrop (white text stays readable) and a brighter glow. */
export interface ArtColors {
  /** Backdrop for the mini player / mobile Now Playing gradient. */
  art: string;
  /** Glow under the desktop Now Playing artwork. */
  glow: string;
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h =
    max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}

const hsl = (h: number, s: number, l: number) =>
  `hsl(${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%)`;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] =
    h < 60
      ? [c, x, 0]
      : h < 120
        ? [x, c, 0]
        : h < 180
          ? [0, c, x]
          : h < 240
            ? [0, x, c]
            : h < 300
              ? [x, 0, c]
              : [c, 0, x];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}

/** WCAG relative luminance of an sRGB colour (0–255 channels). */
export function luminance([r, g, b]: [number, number, number]): number {
  const lin = (c: number) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

export const contrast = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

/** --color-text-secondary (#A1A1B5): the dimmest text drawn on the art backdrop. */
const SECONDARY_TEXT_LUMINANCE = luminance([0xa1, 0xa1, 0xb5]);
const MIN_CONTRAST = 4.5;

/**
 * Picks the art's dominant hue from RGBA pixels, weighting saturated mid-tone pixels so a
 * colourful cover isn't washed out by its dark/white areas. Returns null for near-greyscale art.
 */
export function artColorsFromPixels(data: Uint8ClampedArray): ArtColors | null {
  // 12 hue buckets of 30°.
  const buckets = Array.from({ length: 12 }, () => ({ w: 0, s: 0, h: 0 }));
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue;
    const [h, s, l] = rgbToHsl(data[i], data[i + 1], data[i + 2]);
    if (s < 0.15 || l < 0.08 || l > 0.92) continue;
    const w = s * (1 - Math.abs(l - 0.5) * 2);
    const b = buckets[Math.floor(h / 30) % 12];
    b.w += w;
    b.s += s * w;
    b.h += h * w;
  }
  const best = buckets.reduce((a, b) => (b.w > a.w ? b : a));
  if (best.w < 0.5) return null;
  const hue = best.h / best.w;
  const sat = best.s / best.w;
  const artSat = clamp(sat, 0.35, 0.6);
  // Darken until even secondary text on the backdrop meets WCAG AA (4.5:1).
  let artL = 0.26;
  while (
    artL > 0.08 &&
    contrast(luminance(hslToRgb(hue, artSat, artL)), SECONDARY_TEXT_LUMINANCE) < MIN_CONTRAST
  ) {
    artL -= 0.01;
  }
  return {
    art: hsl(hue, artSat, artL),
    glow: hsl(hue, clamp(sat, 0.5, 0.85), 0.6),
  };
}
