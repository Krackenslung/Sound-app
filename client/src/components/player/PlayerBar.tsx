import type { LucideIcon } from 'lucide-react';
import {
  Heart,
  ListMusic,
  Play,
  Repeat,
  Shuffle,
  SkipBack,
  SkipForward,
  Speaker,
  Volume2,
} from 'lucide-react';

function IconButton({
  icon: Icon,
  label,
  className,
}: {
  icon: LucideIcon;
  label: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled
      className="rounded-full text-text-primary disabled:cursor-not-allowed"
    >
      <Icon aria-hidden className={className} strokeWidth={1.8} />
    </button>
  );
}

// Figma: PlayerBar (node 4:111) — 88px tall, 3 columns: now playing · controls (560px) · extras.
// Phase 0 placeholder: static layout, controls disabled until the Web Playback SDK lands in Phase 2.
export function PlayerBar() {
  return (
    <footer
      aria-label="Player"
      className="flex h-player-bar shrink-0 items-center gap-6 border-t border-border bg-surface px-6"
    >
      <div className="flex min-w-0 flex-1 items-center gap-3.5">
        <div className="size-14 shrink-0 rounded-lg bg-surface-2" />
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate text-body font-semibold">Nothing playing</span>
          <span className="truncate text-caption text-text-secondary">Pick a track to start</span>
        </div>
        <IconButton icon={Heart} label="Like" className="size-5 opacity-40" />
      </div>

      <div className="flex w-controls shrink-0 flex-col items-center gap-2">
        <div className="flex items-center gap-6">
          <IconButton icon={Shuffle} label="Shuffle" className="size-[18px] opacity-60" />
          <IconButton icon={SkipBack} label="Previous" className="size-[22px] opacity-60" />
          <button
            type="button"
            aria-label="Play"
            disabled
            className="flex size-10 items-center justify-center rounded-full bg-text-primary disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Play aria-hidden className="size-[18px] fill-bg text-bg" />
          </button>
          <IconButton icon={SkipForward} label="Next" className="size-[22px] opacity-60" />
          <IconButton icon={Repeat} label="Repeat" className="size-[18px] opacity-60" />
        </div>
        <div className="flex w-full items-center gap-2.5 text-caption text-text-secondary">
          <span>0:00</span>
          <div className="h-1 flex-1 rounded-sm bg-surface-hover" aria-hidden />
          <span>0:00</span>
        </div>
      </div>

      <div className="flex min-w-0 flex-1 items-center justify-end gap-[18px]">
        <IconButton icon={ListMusic} label="Queue" className="size-5 opacity-75" />
        <IconButton icon={Speaker} label="Devices" className="size-5 opacity-75" />
        <IconButton icon={Volume2} label="Volume" className="size-5 opacity-75" />
        <div className="h-1 w-24 overflow-hidden rounded-sm bg-surface-hover" aria-hidden>
          <div className="h-1 w-[66px] rounded-sm bg-text-primary" />
        </div>
      </div>
    </footer>
  );
}
