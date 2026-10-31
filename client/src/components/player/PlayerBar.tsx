import { Link, useLocation, useNavigate } from 'react-router';
import type { LucideIcon } from 'lucide-react';
import {
  ListMusic,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume1,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { Artwork } from '@/components/media/Artwork';
import { LikeButton } from '@/components/tracks/LikeButton';
import { Slider } from '@/components/ui/Slider';
import { EntityLinks } from '@/components/ui/EntityLinks';
import { DevicePicker } from './DevicePicker';
import { usePlayerControls } from '@/features/player/playerContext';
import { usePlaybackPosition } from '@/hooks/usePlaybackPosition';
import { cn } from '@/lib/cn';
import { formatDuration } from '@/lib/format';
import { artistPath } from '@/lib/spotifyUri';
import { usePlayerStore } from '@/store/playerStore';

function IconButton({
  icon: Icon,
  label,
  onClick,
  disabled,
  active,
  className,
  title,
}: {
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  active?: boolean;
  className?: string;
  title?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      title={title ?? label}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'rounded-full transition-[opacity,color] disabled:cursor-not-allowed disabled:opacity-30',
        active ? 'text-accent' : 'text-text-primary',
      )}
    >
      <Icon aria-hidden className={className} strokeWidth={1.8} />
    </button>
  );
}

const SEEK_STEP_MS = 5000;

// Figma: PlayerBar (node 4:111) — 88px tall, 3 columns: now playing · controls (560px) · extras.
export function PlayerBar() {
  const controls = usePlayerControls();
  const track = usePlayerStore((s) => s.track);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const durationMs = usePlayerStore((s) => s.durationMs);
  const shuffle = usePlayerStore((s) => s.shuffle);
  const repeat = usePlayerStore((s) => s.repeat);
  const volume = usePlayerStore((s) => s.volume);
  const activeDevice = usePlayerStore((s) => s.activeDevice);
  const position = usePlaybackPosition();
  const location = useLocation();
  const navigate = useNavigate();
  const onNowPlaying = location.pathname === '/now-playing';

  const can = controls.canControl;
  const hasTrack = Boolean(track);
  const premiumHint = can ? undefined : 'Requires Spotify Premium';
  const VolumeIcon = volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  return (
    <footer
      aria-label="Player"
      className="hidden h-player-bar shrink-0 items-center gap-6 border-t border-border bg-surface px-6 md:flex"
    >
      <div className="flex min-w-0 flex-1 items-center gap-3.5">
        {track ? (
          <>
            <Link to="/now-playing" aria-label="Open Now Playing" className="shrink-0 rounded-lg">
              <Artwork
                images={track.album.images}
                size={56}
                seed={track.album.uri}
                className="size-14 rounded-lg"
              />
            </Link>
            <div className="flex min-w-0 flex-col gap-0.5">
              <Link to="/now-playing" className="truncate text-body font-semibold hover:underline">
                {track.name}
              </Link>
              <span className="truncate text-caption text-text-secondary">
                <EntityLinks items={track.artists} pathFor={artistPath} />
              </span>
            </div>
            <LikeButton uri={track.uri} title={track.name} iconClassName="size-5" />
          </>
        ) : (
          <>
            <div className="size-14 shrink-0 rounded-lg bg-surface-2" />
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="truncate text-body font-semibold">Nothing playing</span>
              <span className="truncate text-caption text-text-secondary">
                Pick a track to start
              </span>
            </div>
          </>
        )}
      </div>

      <div className="flex w-controls shrink-0 flex-col items-center gap-2">
        <div className="flex items-center gap-6">
          <IconButton
            icon={Shuffle}
            label="Shuffle"
            active={shuffle}
            onClick={controls.toggleShuffle}
            disabled={!can || !hasTrack}
            title={premiumHint}
            className={cn('size-[18px]', !shuffle && 'opacity-60')}
          />
          <IconButton
            icon={SkipBack}
            label="Previous"
            onClick={controls.previous}
            disabled={!can || !hasTrack}
            title={premiumHint}
            className="size-[22px] fill-current"
          />
          <button
            type="button"
            aria-label={isPlaying ? 'Pause' : 'Play'}
            title={premiumHint}
            onClick={controls.togglePlay}
            disabled={!can || !hasTrack}
            className="flex size-10 items-center justify-center rounded-full bg-text-primary text-bg transition-transform hover:scale-105 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
          >
            {isPlaying ? (
              <Pause aria-hidden className="size-[18px] fill-current" />
            ) : (
              <Play aria-hidden className="ml-0.5 size-[18px] fill-current" />
            )}
          </button>
          <IconButton
            icon={SkipForward}
            label="Next"
            onClick={controls.next}
            disabled={!can || !hasTrack}
            title={premiumHint}
            className="size-[22px] fill-current"
          />
          <IconButton
            icon={repeat === 'track' ? Repeat1 : Repeat}
            label={`Repeat: ${repeat}`}
            active={repeat !== 'off'}
            onClick={controls.cycleRepeat}
            disabled={!can || !hasTrack}
            title={premiumHint}
            className={cn('size-[18px]', repeat === 'off' && 'opacity-60')}
          />
        </div>
        <div className="flex w-full items-center gap-2.5 text-caption text-text-secondary">
          <span className="w-10 text-right tabular-nums">{formatDuration(position)}</span>
          <Slider
            label="Seek"
            value={Math.min(position, durationMs)}
            max={durationMs}
            step={SEEK_STEP_MS}
            valueText={`${formatDuration(position)} of ${formatDuration(durationMs)}`}
            disabled={!can || !hasTrack}
            onCommit={controls.seek}
            className="flex-1"
          />
          <span className="w-10 tabular-nums">{formatDuration(durationMs)}</span>
        </div>
      </div>

      <div className="flex min-w-0 flex-1 items-center justify-end gap-[18px]">
        {activeDevice && !activeDevice.isLocal && (
          <span className="hidden truncate text-caption text-accent-hover xl:inline">
            Playing on {activeDevice.name}
          </span>
        )}
        <IconButton
          icon={ListMusic}
          label="Queue"
          active={onNowPlaying}
          onClick={() => (onNowPlaying ? navigate(-1) : navigate('/now-playing'))}
          className={cn('size-5', !onNowPlaying && 'opacity-75')}
        />
        <DevicePicker />
        <IconButton
          icon={VolumeIcon}
          label={volume === 0 ? 'Unmute' : 'Mute'}
          onClick={() => controls.setVolume(volume === 0 ? 0.7 : 0)}
          disabled={!can}
          title={premiumHint}
          className="size-5 opacity-75"
        />
        <Slider
          label="Volume"
          variant="neutral"
          value={Math.round(volume * 100)}
          max={100}
          step={5}
          valueText={`${Math.round(volume * 100)}%`}
          disabled={!can}
          onCommit={(v) => controls.setVolume(v / 100)}
          className="w-24"
        />
      </div>
    </footer>
  );
}
