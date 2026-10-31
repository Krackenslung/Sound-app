import { MoreHorizontal } from 'lucide-react';
import { Link } from 'react-router';
import { Artwork } from '@/components/media/Artwork';
import { LikeButton } from '@/components/tracks/LikeButton';
import { QueuePanel } from '@/components/player/QueuePanel';
import { Button } from '@/components/ui/Button';
import { buttonClasses } from '@/components/ui/buttonStyles';
import { EntityLinks } from '@/components/ui/EntityLinks';
import { albumPath, artistPath } from '@/lib/spotifyUri';
import { usePlayerStore } from '@/store/playerStore';
import { useUiStore } from '@/store/uiStore';

// Figma: 03 · Now Playing (node 6:323).
export function NowPlayingPage() {
  const track = usePlayerStore((s) => s.track);
  const openAddToPlaylist = useUiStore((s) => s.openAddToPlaylist);

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
            <EntityLinks items={track.artists} pathFor={artistPath} />
            {' · '}
            <EntityLinks items={[track.album]} pathFor={albumPath} />
          </p>
        </div>
        <div className="flex items-center gap-3">
          <LikeButton
            uri={track.uri}
            title={track.name}
            iconClassName="size-5"
            className="size-11 bg-surface-2 !opacity-100"
          />
          <Button variant="secondary" onClick={() => openAddToPlaylist([track.uri])}>
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

      <QueuePanel />
    </div>
  );
}
