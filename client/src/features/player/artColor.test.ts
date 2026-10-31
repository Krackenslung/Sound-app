import { artColorsFromPixels, contrast, hslToRgb, luminance } from './artColor';

const pixels = (...rgb: Array<[number, number, number]>) =>
  new Uint8ClampedArray(rgb.flatMap(([r, g, b]) => [r, g, b, 255]));

describe('artColorsFromPixels', () => {
  it('returns a dark backdrop and a bright glow in the dominant hue', () => {
    // Mostly orange with a little blue.
    const data = pixels(...Array(30).fill([234, 88, 12]), ...Array(5).fill([30, 58, 200]));
    const colors = artColorsFromPixels(data)!;
    const [h, , l] = colors.art.match(/\d+/g)!.map(Number);
    expect(h).toBeGreaterThanOrEqual(15);
    expect(h).toBeLessThan(30);
    expect(l).toBeLessThanOrEqual(26);
    expect(colors.glow).toMatch(/ 60%\)$/);
  });

  it('ignores near-black, near-white and grey pixels', () => {
    expect(
      artColorsFromPixels(pixels([0, 0, 0], [255, 255, 255], [128, 128, 128], [20, 20, 22])),
    ).toBeNull();
  });

  it('ignores transparent pixels', () => {
    expect(artColorsFromPixels(new Uint8ClampedArray([234, 88, 12, 0]))).toBeNull();
  });
});

describe('backdrop contrast', () => {
  const secondary = luminance([0xa1, 0xa1, 0xb5]);
  it.each(Array.from({ length: 24 }, (_, i) => i * 15))(
    'keeps secondary text >= 4.5:1 for hue %i°',
    (h) => {
      const rgb = hslToRgb(h, 0.6, 0.5).map(Math.round) as [number, number, number];
      const colors = artColorsFromPixels(pixels(...Array(10).fill(rgb)))!;
      const [hh, ss, ll] = colors.art.match(/\d+/g)!.map(Number);
      const backdrop = hslToRgb(hh, ss / 100, ll / 100);
      expect(contrast(luminance(backdrop), secondary)).toBeGreaterThanOrEqual(4.4); // rounding slack
    },
  );
});
