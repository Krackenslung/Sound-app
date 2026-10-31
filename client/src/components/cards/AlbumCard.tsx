import { Link } from 'react-router';
import { Play } from 'lucide-react';
import type { Image } from '@/api/types';
import { Artwork } from '@/components/media/Artwork';

export interface AlbumCardProps {
  title: string;
  subtitle: string;
  seed: string;
  images?: Image[];
  onPlay?: () => void;
  /** Detail page; makes the art and title a link. */
  to?: string;
  /** Fill the grid cell instead of the fixed 184px Figma width. */
  fluid?: boolean;
}

// Figma: AlbumCard (node 3:51) — 184px wide, 160px art, surface bg, 12px radius.
export function AlbumCard({ title, subtitle, seed, images, onPlay, to, fluid }: AlbumCardProps) {
  const art = fluid ? 'aspect-square w-full rounded-lg' : 'size-40 rounded-lg';
  return (
    <div
      className={`group relative flex shrink-0 flex-col gap-3 rounded-xl bg-surface px-3 pb-4 pt-3 transition-colors hover:bg-surface-2 ${fluid ? 'w-full min-w-0' : 'w-[184px]'}`}
    >
      <div className="relative">
        {to ? (
          <Link to={to} tabIndex={-1} aria-hidden>
            <Artwork images={images} size={160} seed={seed} className={art} />
          </Link>
        ) : (
          <Artwork images={images} size={160} seed={seed} className={art} />
        )}
        {onPlay && (
          <button
            type="button"
            aria-label={`Play ${title}`}
            onClick={onPlay}
            className="absolute bottom-2 right-2 flex size-11 translate-y-1 items-center justify-center rounded-full bg-accent text-on-accent opacity-0 shadow-popover transition-all hover:bg-accent-strong-hover focus-visible:translate-y-0 focus-visible:opacity-100 group-hover:translate-y-0 group-hover:opacity-100"
          >
            <Play aria-hidden className="size-5 fill-current" />
          </button>
        )}
      </div>
      <div className="flex min-w-0 flex-col gap-1">
        {to ? (
          <Link to={to} className="truncate text-body font-semibold hover:underline">
            {title}
          </Link>
        ) : (
          <span className="truncate text-body font-semibold">{title}</span>
        )}
        <span className="truncate text-caption text-text-secondary">{subtitle}</span>
      </div>
    </div>
  );
}
