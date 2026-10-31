import { useParams } from 'react-router';
import { ListMinus, Play, Shuffle } from 'lucide-react';
import { isApiError } from '@/api/client';
import { Artwork } from '@/components/media/Artwork';
import { TrackRow } from '@/components/tracks/TrackRow';
import { TrackTableHeader } from '@/components/tracks/TrackTableHeader';
import { LoadMore } from '@/components/ui/LoadMore';
import { OpenInSpotify } from '@/components/brand/OpenInSpotify';
import { usePlaylist, usePlaylistItems, useRemoveFromPlaylist } from '@/features/library/queries';
import { usePlayerControls } from '@/features/player/playerContext';
import { useTrackMenu } from '@/features/tracks/useTrackMenu';
import { artistNames } from '@/lib/format';
import { usePlayerStore } from '@/store/playerStore';
import { DetailError, DetailSkeleton } from './detailStates';

export function PlaylistPage() {
  const { id = '' } = useParams();
  const controls = usePlayerControls();
  const trackMenu = useTrackMenu();
  const currentUri = usePlayerStore((s) => s.track?.uri);
  const playlist = usePlaylist(id);
  const items = usePlaylistItems(id, playlist.isSuccess);
  const remove = useRemoveFromPlaylist(id);

  if (playlist.isPending) return <DetailSkeleton />;
  if (playlist.isError) {
    return (
      <DetailError
        notFound={isApiError(playlist.error, 404) || isApiError(playlist.error, 400)}
        what="playlist"
      />
    );
  }

  const p = playlist.data;
  const rows = items.data?.pages.flatMap((pg) => pg.items) ?? [];
  const meta = [
    p.isOwner ? 'By you' : p.ownerName,
    p.totalItems != null && `${p.totalItems} ${p.totalItems === 1 ? 'song' : 'songs'}`,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <>
      <header className="flex flex-col items-start gap-5 sm:flex-row sm:items-end sm:gap-8">
        <Artwork
          images={p.images}
          size={232}
          seed={p.uri}
          alt={`${p.name} cover`}
          className="size-40 sm:size-[232px] rounded-2xl shadow-art"
        />
        <div className="flex min-w-0 flex-col gap-3">
          <p className="text-overline uppercase text-accent-hover">
            {p.collaborative ? 'Collaborative playlist' : 'Playlist'}
          </p>
          <h1 className="line-clamp-2 text-h1 sm:text-display">{p.name}</h1>
          {p.description && (
            <p className="line-clamp-2 text-body text-text-secondary">{p.description}</p>
          )}
          <p className="text-body text-text-secondary">{meta}</p>
        </div>
      </header>

      <div className="flex items-center gap-5">
        <button
          type="button"
          aria-label={`Play ${p.name}`}
          disabled={!controls.canControl}
          onClick={() => controls.playContext(p.uri)}
          className="flex size-14 items-center justify-center rounded-full bg-accent text-on-accent transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Play aria-hidden className="ml-0.5 size-6 fill-current" />
        </button>
        <button
          type="button"
          aria-label={`Shuffle ${p.name}`}
          disabled={!controls.canControl}
          onClick={() => controls.shufflePlay(p.uri)}
          className="rounded-full text-accent-hover hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Shuffle aria-hidden className="size-6" />
        </button>
        <OpenInSpotify uri={p.uri} className="ml-auto" />
      </div>

      <section aria-label="Playlist tracks" className="flex flex-col gap-1">
        {items.isPending ? (
          <div className="flex flex-col gap-2" aria-busy="true">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded-lg bg-surface" />
            ))}
          </div>
        ) : items.isError ? (
          <p className="text-body text-text-secondary">
            {isApiError(items.error) && items.error.code === 'ENDPOINT_UNAVAILABLE'
              ? `${items.error.message} You can still play it.`
              : "Couldn't load the songs in this playlist."}
          </p>
        ) : rows.length === 0 ? (
          <p className="text-body text-text-secondary">
            This playlist is empty. Use “Add to playlist” on any track to add songs.
          </p>
        ) : (
          <>
            <TrackTableHeader withMenu />
            {rows.map(({ track: t }, i) => (
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
                onPlay={() => controls.playContext(p.uri, t.uri)}
                menuItems={[
                  ...trackMenu(t),
                  ...(p.editable
                    ? [
                        {
                          label: 'Remove from this playlist',
                          icon: <ListMinus aria-hidden className="size-4" />,
                          onSelect: () => remove.mutate(t.uri),
                        },
                      ]
                    : []),
                ]}
              />
            ))}
            <div className="pt-3">
              <LoadMore
                hasMore={items.hasNextPage}
                loading={items.isFetchingNextPage}
                onClick={() => void items.fetchNextPage()}
                label="Load more songs"
              />
            </div>
          </>
        )}
      </section>
    </>
  );
}
