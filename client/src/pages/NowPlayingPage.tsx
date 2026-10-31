import { Laptop, MoreHorizontal, Speaker } from 'lucide-react';
import { Link } from 'react-router';
import { Artwork } from '@/components/media/Artwork';
import { LikeButton } from '@/components/tracks/LikeButton';
import { TrackRow } from '@/components/tracks/TrackRow';
import { Button } from '@/components/ui/Button';
import { buttonClasses } from '@/components/ui/buttonStyles';
import { artistNames } from '@/lib/format';
import { usePlayerStore } from '@/store/playerStore';

const Overline = ({ children }: { children: React.ReactNode }) => (
  <p className="text-overline uppercase text-text-muted">{children}</p>
);

// Figma: 03 · Now Playing (node 6:323). Device picker popover arrives with the devices work.
export function NowPlayingPage() {
  const track = usePlayerStore((s) => s.track);
  const nextTracks = usePlayerStore((s) => s.nextTracks);
  const activeDevice = usePlayerStore((s) => s.activeDevice);

  if (!track) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <h1 className="text-h1">Nothing playing</h1>
        <p className="text-text-secondary">Start something from Home and it will show up here.</p>
        <Link to="/" className={buttonClasses('primary')}>
          Go to Home
        </Link>
      </div>
    );
  }

  const DeviceIcon = activeDevice?.isLocal ? Laptop : Speaker;

  return (
    <div className="flex min-h-0 flex-1 gap-12">
      <section aria-label="Now playing" className="flex w-[440px] shrink-0 flex-col gap-6">
        <Artwork
          images={track.album.images}
          size={440}
          seed={track.album.uri}
          alt={`${track.album.name} cover`}
          className="aspect-square w-full rounded-[20px] shadow-art"
        />
        <div className="flex min-w-0 flex-col gap-1.5">
          <p className="text-overline uppercase text-accent-hover">Now playing</p>
          <h1 className="line-clamp-2 text-display">{track.name}</h1>
          <p className="truncate text-h3 text-text-secondary">
            {artistNames(track.artists)} · {track.album.name}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <LikeButton
            uri={track.uri}
            title={track.name}
            iconClassName="size-5"
            className="size-11 bg-surface-2 !opacity-100"
          />
          <Button variant="secondary" disabled title="Coming soon">
            Add to playlist
          </Button>
          <button
            type="button"
            aria-label="More options"
            disabled
            className="flex size-11 items-center justify-center rounded-full bg-surface-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <MoreHorizontal aria-hidden className="size-5" />
          </button>
        </div>
      </section>

      <section
        aria-labelledby="queue-heading"
        className="flex min-w-0 flex-1 flex-col gap-3 self-stretch overflow-y-auto rounded-2xl border border-border bg-surface p-5"
      >
        <div className="flex items-center justify-between gap-4">
          <h2 id="queue-heading" className="text-h2">
            Queue
          </h2>
          {activeDevice && (
            <span className="flex items-center gap-1.5 truncate rounded-full bg-accent-soft px-3 py-1.5 text-caption text-accent-hover">
              <DeviceIcon aria-hidden className="size-3.5 shrink-0" />
              {activeDevice.isLocal ? 'Playing on this browser' : `Playing on ${activeDevice.name}`}
            </span>
          )}
        </div>
        <Overline>Now playing</Overline>
        <TrackRow
          index="▶"
          uri={track.uri}
          title={track.name}
          artist={artistNames(track.artists)}
          album={track.album.name}
          durationMs={track.durationMs}
          images={track.album.images}
          playing
          hideAlbum
        />
        <Overline>Next up</Overline>
        {nextTracks.length > 0 ? (
          nextTracks.map((t, i) => (
            <TrackRow
              key={`${t.uri}-${i}`}
              index={i + 1}
              uri={t.uri}
              title={t.name}
              artist={artistNames(t.artists)}
              album={t.album.name}
              durationMs={t.durationMs}
              images={t.album.images}
              hideAlbum
            />
          ))
        ) : (
          <p className="px-4 text-caption text-text-secondary">
            {activeDevice?.isLocal
              ? 'Nothing queued up next.'
              : 'Up next is shown while playing in this browser.'}
          </p>
        )}
      </section>
    </div>
  );
}
