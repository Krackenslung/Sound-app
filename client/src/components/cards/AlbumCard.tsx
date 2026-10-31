import { Play } from 'lucide-react';
import type { Image } from '@/api/types';
import { Artwork } from '@/components/media/Artwork';

export interface AlbumCardProps {
  title: string;
  subtitle: string;
  seed: string;
  images?: Image[];
  onPlay?: () => void;
}

// Figma: AlbumCard (node 3:51) — 184px wide, 160px art, surface bg, 12px radius.
export function AlbumCard({ title, subtitle, seed, images, onPlay }: AlbumCardProps) {
  return (
    <div className="group relative flex w-[184px] shrink-0 flex-col gap-3 rounded-xl bg-surface px-3 pb-4 pt-3 transition-colors hover:bg-surface-2">
      <div className="relative">
        <Artwork images={images} size={160} seed={seed} className="size-40 rounded-lg" />
        {onPlay && (
          <button
            type="button"
            aria-label={`Play ${title}`}
            onClick={onPlay}
            className="absolute bottom-2 right-2 flex size-11 translate-y-1 items-center justify-center rounded-full bg-accent text-on-accent opacity-0 shadow-popover transition-all hover:bg-accent-hover focus-visible:translate-y-0 focus-visible:opacity-100 group-hover:translate-y-0 group-hover:opacity-100"
          >
            <Play aria-hidden className="size-5 fill-current" />
          </button>
        )}
      </div>
      <div className="flex min-w-0 flex-col gap-1">
        <span className="truncate text-body font-semibold">{title}</span>
        <span className="truncate text-caption text-text-secondary">{subtitle}</span>
      </div>
    </div>
  );
}
