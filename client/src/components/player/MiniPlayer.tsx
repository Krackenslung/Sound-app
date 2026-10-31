import { Link } from 'react-router';
import { Pause, Play } from 'lucide-react';
import { Artwork } from '@/components/media/Artwork';
import { usePlayerControls } from '@/features/player/playerContext';
import { artistNames } from '@/lib/format';
import { usePlayerStore } from '@/store/playerStore';
import { DevicePicker } from './DevicePicker';

// Figma: Mini player (node 8:1399) — replaces the PlayerBar below 768px.
export function MiniPlayer() {
  const track = usePlayerStore((s) => s.track);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const controls = usePlayerControls();
  if (!track) return null;

  return (
    <div className="shrink-0 px-2 pb-2 md:hidden">
      <div className="flex items-center gap-3 rounded-xl bg-art px-2.5 py-2 transition-colors duration-500">
        <Link
          to="/now-playing"
          className="flex min-w-0 flex-1 items-center gap-3"
          aria-label={`Open Now Playing: ${track.name}`}
        >
          <Artwork
            images={track.album.images}
            size={40}
            seed={track.album.uri}
            className="size-10 rounded-md"
          />
          <span className="flex min-w-0 flex-col gap-px">
            <span className="truncate text-body font-semibold">{track.name}</span>
            <span className="truncate text-caption text-text-secondary">
              {artistNames(track.artists)}
            </span>
          </span>
        </Link>
        <DevicePicker placement="mini" />
        <button
          type="button"
          aria-label={isPlaying ? 'Pause' : 'Play'}
          disabled={!controls.canControl}
          onClick={controls.togglePlay}
          className="flex size-9 items-center justify-center rounded-full disabled:opacity-40"
        >
          {isPlaying ? (
            <Pause aria-hidden className="size-[22px] fill-current" />
          ) : (
            <Play aria-hidden className="size-[22px] fill-current" />
          )}
        </button>
      </div>
    </div>
  );
}
