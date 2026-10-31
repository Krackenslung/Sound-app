import { Play } from 'lucide-react';
import type { Image } from '@/api/types';
import { Artwork } from '@/components/media/Artwork';
import { cn } from '@/lib/cn';
import { formatDuration } from '@/lib/format';
import { LikeButton } from './LikeButton';

export interface TrackRowProps {
  /** Shown in the leading column; e.g. a number or "▶". */
  index: string | number;
  uri: string;
  title: string;
  artist: string;
  album: string;
  durationMs: number;
  images?: Image[];
  /** The row's track is the current track. */
  playing?: boolean;
  hideAlbum?: boolean;
  onPlay?: () => void;
}

// Figma: TrackRow (node 3:50) — 56px row, Default / Playing (surface-2 bg, accent index + title).
export function TrackRow({
  index,
  uri,
  title,
  artist,
  album,
  durationMs,
  images,
  playing = false,
  hideAlbum = false,
  onPlay,
}: TrackRowProps) {
  return (
    <div
      onClick={onPlay}
      aria-current={playing ? 'true' : undefined}
      className={cn(
        'group flex h-14 w-full items-center gap-4 rounded-lg px-4 py-2 transition-colors',
        playing ? 'bg-surface-2' : 'hover:bg-surface',
        onPlay && 'cursor-pointer',
      )}
    >
      <div className="relative flex w-6 shrink-0 justify-center">
        <span
          className={cn(
            'text-body',
            playing ? 'text-accent' : 'text-text-secondary',
            onPlay && 'group-focus-within:invisible group-hover:invisible',
          )}
        >
          {index}
        </span>
        {onPlay && (
          <button
            type="button"
            aria-label={`Play ${title}`}
            onClick={(e) => {
              e.stopPropagation();
              onPlay();
            }}
            className="absolute inset-0 flex items-center justify-center rounded opacity-0 focus-visible:opacity-100 group-hover:opacity-100"
          >
            <Play aria-hidden className="size-4 fill-current text-text-primary" />
          </button>
        )}
      </div>
      <Artwork images={images} size={40} seed={uri} className="size-10 rounded-md" />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span
          className={cn(
            'truncate text-body font-semibold',
            playing ? 'text-accent' : 'text-text-primary',
          )}
        >
          {title}
        </span>
        <span className="truncate text-caption text-text-secondary">{artist}</span>
      </div>
      {!hideAlbum && (
        <span className="hidden w-60 shrink-0 truncate text-body text-text-secondary md:block">
          {album}
        </span>
      )}
      <LikeButton uri={uri} title={title} />
      <span className="w-11 shrink-0 text-right text-caption text-text-secondary">
        {formatDuration(durationMs)}
      </span>
    </div>
  );
}
