import { useRef } from 'react';
import { useNavigate } from 'react-router';
import { useQueryClient, type InfiniteData } from '@tanstack/react-query';
import {
  ChevronDown,
  ListMusic,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
} from 'lucide-react';
import type { MyPlaylist, OffsetPage } from '@/api/types';
import { Artwork } from '@/components/media/Artwork';
import { LikeButton } from '@/components/tracks/LikeButton';
import { Menu } from '@/components/ui/Menu';
import { Slider } from '@/components/ui/Slider';
import { EntityLinks } from '@/components/ui/EntityLinks';
import { libraryKeys } from '@/features/library/queries';
import { usePlayerControls } from '@/features/player/playerContext';
import { useTrackMenu } from '@/features/tracks/useTrackMenu';
import { usePlaybackPosition } from '@/hooks/usePlaybackPosition';
import { cn } from '@/lib/cn';
import { formatDuration } from '@/lib/format';
import { artistPath } from '@/lib/spotifyUri';
import { usePlayerStore, type PlayerTrack } from '@/store/playerStore';
import { DevicePicker } from './DevicePicker';
import { QueuePanel } from './QueuePanel';

/** "Playing from …" label for the top bar. */
function useContextLabel(track: PlayerTrack, contextUri: string | null): [string, string] {
  const queryClient = useQueryClient();
  if (!contextUri) return ['Now playing', track.album.name];
  if (contextUri.endsWith(':collection')) return ['Playing from playlist', 'Liked Songs'];
  if (contextUri.startsWith('spotify:album:')) return ['Playing from album', track.album.name];
  if (contextUri.startsWith('spotify:artist:'))
    return ['Playing from artist', track.artists[0]?.name ?? ''];
  if (contextUri.startsWith('spotify:playlist:')) {
    const mine = queryClient.getQueryData<InfiniteData<OffsetPage<MyPlaylist>>>(
      libraryKeys.myPlaylists,
    );
    const name = mine?.pages.flatMap((p) => p.items).find((p) => p.uri === contextUri)?.name;
    return ['Playing from playlist', name ?? 'Playlist'];
  }
  return ['Now playing', track.album.name];
}

// Figma: 07 · Mobile · Now Playing (node 8:1250) — full screen over the app below 768px.
export function MobileNowPlaying({ track }: { track: PlayerTrack }) {
  const navigate = useNavigate();
  const controls = usePlayerControls();
  const trackMenu = useTrackMenu();
  const contextUri = usePlayerStore((s) => s.contextUri);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const durationMs = usePlayerStore((s) => s.durationMs);
  const shuffle = usePlayerStore((s) => s.shuffle);
  const repeat = usePlayerStore((s) => s.repeat);
  const position = usePlaybackPosition();
  const queueRef = useRef<HTMLDivElement>(null);
  const [overline, contextName] = useContextLabel(track, contextUri);
  const can = controls.canControl;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Now playing"
      className="fixed inset-0 z-40 overflow-y-auto bg-bg"
      style={{
        backgroundImage: 'linear-gradient(to bottom, var(--color-art), var(--color-bg) 60%)',
      }}
    >
      <div className="flex min-h-full flex-col gap-7 px-6 pb-6 pt-[max(24px,env(safe-area-inset-top))]">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            aria-label="Close Now Playing"
            onClick={() => navigate(-1)}
            className="rounded-full p-1"
          >
            <ChevronDown aria-hidden className="size-[26px]" />
          </button>
          <div className="flex min-w-0 flex-col items-center gap-0.5">
            <p className="text-overline uppercase text-text-secondary">{overline}</p>
            <p className="truncate text-body font-semibold">{contextName}</p>
          </div>
          <Menu label={`More options for ${track.name}`} items={trackMenu(track)} />
        </div>

        <Artwork
          images={track.album.images}
          size={342}
          seed={track.album.uri}
          alt={`${track.album.name} cover`}
          className="aspect-square w-full rounded-2xl shadow-popover"
        />

        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-1">
            <h1 className="truncate text-h1">{track.name}</h1>
            <p className="truncate text-h3 text-text-secondary">
              <EntityLinks items={track.artists} pathFor={artistPath} />
            </p>
          </div>
          <LikeButton uri={track.uri} title={track.name} iconClassName="size-7" />
        </div>

        <div className="flex flex-col gap-2">
          <Slider
            label="Seek"
            variant="on-art"
            value={Math.min(position, durationMs)}
            max={durationMs}
            step={5000}
            valueText={`${formatDuration(position)} of ${formatDuration(durationMs)}`}
            disabled={!can}
            onCommit={controls.seek}
          />
          <div className="flex justify-between text-caption tabular-nums text-text-secondary">
            <span>{formatDuration(position)}</span>
            <span>-{formatDuration(Math.max(0, durationMs - position))}</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <button
            type="button"
            aria-label="Shuffle"
            aria-pressed={shuffle}
            disabled={!can}
            onClick={controls.toggleShuffle}
            className={cn(
              'rounded-full disabled:opacity-30',
              shuffle ? 'text-accent-hover' : 'opacity-70',
            )}
          >
            <Shuffle aria-hidden className="size-6" />
          </button>
          <button
            type="button"
            aria-label="Previous"
            disabled={!can}
            onClick={controls.previous}
            className="rounded-full disabled:opacity-30"
          >
            <SkipBack aria-hidden className="size-[34px] fill-current" />
          </button>
          <button
            type="button"
            aria-label={isPlaying ? 'Pause' : 'Play'}
            disabled={!can}
            onClick={controls.togglePlay}
            className="flex size-[72px] items-center justify-center rounded-full bg-text-primary text-bg disabled:opacity-40"
          >
            {isPlaying ? (
              <Pause aria-hidden className="size-[30px] fill-current" />
            ) : (
              <Play aria-hidden className="ml-1 size-[30px] fill-current" />
            )}
          </button>
          <button
            type="button"
            aria-label="Next"
            disabled={!can}
            onClick={controls.next}
            className="rounded-full disabled:opacity-30"
          >
            <SkipForward aria-hidden className="size-[34px] fill-current" />
          </button>
          <button
            type="button"
            aria-label={`Repeat: ${repeat}`}
            aria-pressed={repeat !== 'off'}
            disabled={!can}
            onClick={controls.cycleRepeat}
            className={cn(
              'rounded-full disabled:opacity-30',
              repeat !== 'off' ? 'text-accent-hover' : 'opacity-70',
            )}
          >
            {repeat === 'track' ? (
              <Repeat1 aria-hidden className="size-6" />
            ) : (
              <Repeat aria-hidden className="size-6" />
            )}
          </button>
        </div>

        <div className="flex-1" />

        <div className="flex items-center justify-between">
          <DevicePicker placement="sheet" />
          <button
            type="button"
            aria-label="Show queue"
            onClick={() => queueRef.current?.scrollIntoView({ behavior: 'smooth' })}
            className="rounded-full p-1"
          >
            <ListMusic aria-hidden className="size-[22px]" />
          </button>
        </div>
      </div>
      <div ref={queueRef} className="flex px-4 pb-8">
        <QueuePanel />
      </div>
    </div>
  );
}
