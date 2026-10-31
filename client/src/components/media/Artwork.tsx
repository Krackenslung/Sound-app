import { cn } from '@/lib/cn';
import { pickImage } from '@/lib/format';
import type { Image } from '@/api/types';

const GRADIENTS = 9;

function gradientFor(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return `var(--art-${(h % GRADIENTS) + 1})`;
}

export interface ArtworkProps {
  images?: Image[];
  /** Rendered size in CSS px; used to pick an appropriately sized image. */
  size: number;
  /** Stable seed (e.g. album URI) for the placeholder gradient. */
  seed: string;
  className?: string;
  alt?: string;
}

/** Spotify artwork, falling back to a placeholder gradient only when there's no image. */
export function Artwork({ images, size, seed, className, alt = '' }: ArtworkProps) {
  const url = pickImage(images, size);
  if (url) {
    return (
      <img
        src={url}
        alt={alt}
        width={size}
        height={size}
        loading="lazy"
        decoding="async"
        className={cn('shrink-0 object-cover', className)}
      />
    );
  }
  return (
    <div
      role={alt ? 'img' : undefined}
      aria-label={alt || undefined}
      aria-hidden={alt ? undefined : true}
      className={cn('shrink-0', className)}
      style={{ backgroundImage: gradientFor(seed) }}
    />
  );
}
