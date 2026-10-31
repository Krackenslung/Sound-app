import { useEffect } from 'react';
import { artColorsFromPixels } from '@/features/player/artColor';
import { pickImage } from '@/lib/format';
import { usePlayerStore } from '@/store/playerStore';

const SAMPLE = 24;

function setColors(colors: { art: string; glow: string } | null) {
  const root = document.documentElement.style;
  if (colors) {
    root.setProperty('--color-art', colors.art);
    root.setProperty('--color-art-glow', colors.glow);
  } else {
    // Fall back to the token defaults in tokens.css.
    root.removeProperty('--color-art');
    root.removeProperty('--color-art-glow');
  }
}

/** Sets --color-art / --color-art-glow from the current track's album art. */
export function useArtColor() {
  const url = usePlayerStore((s) => pickImage(s.track?.album.images, 64));

  useEffect(() => {
    if (!url) {
      setColors(null);
      return;
    }
    let cancelled = false;
    const img = new Image();
    // Spotify's image CDN (i.scdn.co) serves CORS headers, so the canvas stays readable.
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (cancelled) return;
      try {
        const canvas = document.createElement('canvas');
        canvas.width = SAMPLE;
        canvas.height = SAMPLE;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return setColors(null);
        ctx.drawImage(img, 0, 0, SAMPLE, SAMPLE);
        setColors(artColorsFromPixels(ctx.getImageData(0, 0, SAMPLE, SAMPLE).data));
      } catch {
        setColors(null); // tainted canvas or unsupported — keep the defaults
      }
    };
    img.onerror = () => !cancelled && setColors(null);
    img.src = url;
    return () => {
      cancelled = true;
    };
  }, [url]);
}
