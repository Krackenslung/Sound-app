import { useSearchParams } from 'react-router';
import { Heart, MoreHorizontal, Play, Plus, Shuffle, Sparkles } from 'lucide-react';
import { isApiError } from '@/api/client';
import { AlbumCard } from '@/components/cards/AlbumCard';
import { TrackRow } from '@/components/tracks/TrackRow';
import { TrackTableHeader } from '@/components/tracks/TrackTableHeader';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { LoadMore } from '@/components/ui/LoadMore';
import { useAuth } from '@/features/auth/authContext';
import { useLikedTracks, useMyPlaylists, useSavedAlbums } from '@/features/library/queries';
import { usePlayerControls } from '@/features/player/playerContext';
import { useTrackMenu } from '@/features/tracks/useTrackMenu';
import { artistNames } from '@/lib/format';
import { albumPath } from '@/lib/spotifyUri';
import { usePlayerStore } from '@/store/playerStore';
import { useUiStore } from '@/store/uiStore';

type Tab = 'liked' | 'playlists' | 'albums';
const TABS: Array<[Tab, string]> = [
  ['liked', 'Liked Songs'],
  ['playlists', 'Playlists'],
  ['albums', 'Albums'],
];
const GRID = 'grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(184px,1fr))] sm:gap-5';

const Notice = ({ children }: { children: React.ReactNode }) => (
  <p className="text-body text-text-secondary">{children}</p>
);

const RowsSkeleton = () => (
  <div className="flex flex-col gap-2" aria-busy="true" role="status">
    <span className="sr-only">Loading…</span>
    {[0, 1, 2, 3, 4].map((i) => (
      <div key={i} className="h-14 animate-pulse rounded-lg bg-surface" />
    ))}
  </div>
);

function unavailableMessage(err: unknown, fallback: string) {
  return isApiError(err) && err.code === 'ENDPOINT_UNAVAILABLE' ? err.message : fallback;
}

function LikedSongs() {
  const { user } = useAuth();
  const openMonthly = useUiStore((s) => s.setMonthlyPlaylistOpen);
  const controls = usePlayerControls();
  const trackMenu = useTrackMenu();
  const currentUri = usePlayerStore((s) => s.track?.uri);
  const liked = useLikedTracks();
  const items = liked.data?.pages.flatMap((p) => p.items) ?? [];
  const total = liked.data?.pages[0]?.total ?? null;
  // Liked Songs as a playable context.
  const collectionUri = user ? `spotify:user:${user.id}:collection` : null;
  const meta = [
    user?.displayName,
    total != null && `${total.toLocaleString()} ${total === 1 ? 'song' : 'songs'}`,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <>
      {/* Figma: Hero (node 7:971) */}
      <section
        aria-label="Liked Songs"
        className="flex flex-col items-start gap-5 rounded-[20px] p-5 sm:flex-row sm:items-end sm:gap-7 sm:p-7"
        style={{ backgroundImage: 'var(--gradient-liked-hero)' }}
      >
        <div
          className="flex size-28 shrink-0 items-center justify-center rounded-[14px] sm:size-[168px]"
          style={{ backgroundImage: 'var(--art-liked)' }}
        >
          <Heart aria-hidden className="size-16 text-on-accent" strokeWidth={1.6} />
        </div>
        <div className="flex min-w-0 flex-col gap-2">
          <p className="text-overline uppercase">Playlist</p>
          <h1 className="text-h1 sm:text-display">Liked Songs</h1>
          {meta && <p className="text-body text-text-secondary">{meta}</p>}
        </div>
      </section>

      {/* Figma: Actions (node 7:980) */}
      <div className="flex flex-wrap items-center gap-5">
        <button
          type="button"
          aria-label="Play Liked Songs"
          disabled={!controls.canControl || !collectionUri}
          onClick={() => collectionUri && controls.playContext(collectionUri)}
          className="flex size-14 items-center justify-center rounded-full bg-accent text-on-accent transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Play aria-hidden className="ml-0.5 size-6 fill-current" />
        </button>
        <button
          type="button"
          aria-label="Shuffle Liked Songs"
          disabled={!controls.canControl || !collectionUri}
          onClick={() => collectionUri && controls.shufflePlay(collectionUri)}
          className="rounded-full text-accent-hover hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Shuffle aria-hidden className="size-6" />
        </button>
        <button
          type="button"
          aria-label="More options for Liked Songs"
          disabled
          className="rounded-full opacity-70 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <MoreHorizontal aria-hidden className="size-6" />
        </button>
        <div className="flex-1" />
        <Button
          variant="secondary"
          onClick={() => openMonthly(true)}
          icon={<Sparkles aria-hidden className="size-4" />}
        >
          Create monthly playlist
        </Button>
      </div>

      {/* Figma: Track table (node 7:1000) */}
      <section aria-label="Liked tracks" className="flex flex-col gap-1">
        {liked.isPending ? (
          <RowsSkeleton />
        ) : liked.isError ? (
          <Notice>
            {unavailableMessage(liked.error, "Couldn't load your Liked Songs.")} You can still play
            them with the button above.
          </Notice>
        ) : items.length === 0 ? (
          <Notice>Songs you like will appear here. Tap the heart on any track.</Notice>
        ) : (
          <>
            <TrackTableHeader withMenu />
            {items.map(({ track: t }, i) => (
              <TrackRow
                key={`${t.uri}-${i}`}
                index={i + 1}
                uri={t.uri}
                title={t.name}
                artist={artistNames(t.artists)}
                album={t.album.name}
                durationMs={t.durationMs}
                images={t.album.images}
                playing={t.uri === currentUri}
                onPlay={() => collectionUri && controls.playContext(collectionUri, t.uri)}
                menuItems={trackMenu(t)}
              />
            ))}
            <div className="pt-3">
              <LoadMore
                hasMore={liked.hasNextPage}
                loading={liked.isFetchingNextPage}
                onClick={() => void liked.fetchNextPage()}
                label="Load more songs"
              />
            </div>
          </>
        )}
      </section>
    </>
  );
}

function Playlists() {
  const controls = usePlayerControls();
  const openCreate = useUiStore((s) => s.openCreatePlaylist);
  const playlists = useMyPlaylists();
  const items = playlists.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <section aria-label="Your playlists" className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="text-h1">Playlists</h1>
        <Button
          variant="secondary"
          onClick={() => openCreate()}
          icon={<Plus aria-hidden className="size-4" />}
        >
          New playlist
        </Button>
      </div>
      {playlists.isPending ? (
        <RowsSkeleton />
      ) : playlists.isError ? (
        <Notice>Couldn&apos;t load your playlists.</Notice>
      ) : items.length === 0 ? (
        <Notice>You don&apos;t have any playlists yet. Create one to get started.</Notice>
      ) : (
        <>
          <div className={GRID}>
            {items.map((p) => (
              <AlbumCard
                fluid
                key={p.id}
                title={p.name}
                subtitle={[
                  p.isOwner ? 'By you' : p.ownerName && `By ${p.ownerName}`,
                  p.totalItems != null && `${p.totalItems} songs`,
                ]
                  .filter(Boolean)
                  .join(' · ')}
                images={p.images}
                seed={p.uri || p.id}
                to={p.id.startsWith('pending-') ? undefined : `/playlist/${p.id}`}
                onPlay={p.uri ? () => controls.playContext(p.uri) : undefined}
              />
            ))}
          </div>
          <LoadMore
            hasMore={playlists.hasNextPage}
            loading={playlists.isFetchingNextPage}
            onClick={() => void playlists.fetchNextPage()}
            label="Load more playlists"
          />
        </>
      )}
    </section>
  );
}

function SavedAlbums() {
  const controls = usePlayerControls();
  const albums = useSavedAlbums();
  const items = albums.data?.pages.flatMap((p) => p.items) ?? [];
  return (
    <section aria-label="Saved albums" className="flex flex-col gap-5">
      <h1 className="text-h1">Albums</h1>
      {albums.isPending ? (
        <RowsSkeleton />
      ) : albums.isError ? (
        <Notice>{unavailableMessage(albums.error, "Couldn't load your saved albums.")}</Notice>
      ) : items.length === 0 ? (
        <Notice>Albums you save will appear here.</Notice>
      ) : (
        <>
          <div className={GRID}>
            {items.map((a) => (
              <AlbumCard
                fluid
                key={a.uri}
                title={a.name}
                subtitle={artistNames(a.artists)}
                images={a.images}
                seed={a.uri}
                to={albumPath(a.uri) ?? undefined}
                onPlay={() => controls.playContext(a.uri)}
              />
            ))}
          </div>
          <LoadMore
            hasMore={albums.hasNextPage}
            loading={albums.isFetchingNextPage}
            onClick={() => void albums.fetchNextPage()}
            label="Load more albums"
          />
        </>
      )}
    </section>
  );
}

// Figma: 05 · Library · Liked Songs (node 7:803)
export function LibraryPage() {
  const [params, setParams] = useSearchParams();
  const raw = params.get('tab');
  const tab: Tab = raw === 'playlists' || raw === 'albums' ? raw : 'liked';

  return (
    <div className="flex flex-col gap-6">
      <div className="flex gap-2 overflow-x-auto" role="group" aria-label="Library sections">
        {TABS.map(([t, label]) => (
          <Chip
            key={t}
            selected={tab === t}
            onClick={() => setParams(t === 'liked' ? {} : { tab: t }, { replace: true })}
          >
            {label}
          </Chip>
        ))}
      </div>
      {tab === 'liked' ? <LikedSongs /> : tab === 'playlists' ? <Playlists /> : <SavedAlbums />}
    </div>
  );
}
