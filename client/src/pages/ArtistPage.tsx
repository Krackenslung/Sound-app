import { useParams } from 'react-router';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Play } from 'lucide-react';
import { fetchArtist, fetchArtistAlbums } from '@/api/catalog';
import { isApiError } from '@/api/client';
import { AlbumCard } from '@/components/cards/AlbumCard';
import { Artwork } from '@/components/media/Artwork';
import { Button } from '@/components/ui/Button';
import { LoadMore } from '@/components/ui/LoadMore';
import { usePlayerControls } from '@/features/player/playerContext';
import { albumPath } from '@/lib/spotifyUri';
import { DetailError, DetailSkeleton } from './detailStates';

// Note: /artists/{id}/top-tracks is forbidden for this app, so the page shows the discography only.
export function ArtistPage() {
  const { id = '' } = useParams();
  const controls = usePlayerControls();
  const artist = useQuery({
    queryKey: ['artist', id],
    queryFn: () => fetchArtist(id),
    staleTime: 5 * 60_000,
  });
  const albums = useInfiniteQuery({
    queryKey: ['artist', id, 'albums'],
    queryFn: ({ pageParam }) => fetchArtistAlbums(id, pageParam),
    initialPageParam: 0,
    getNextPageParam: (last) => last.nextOffset ?? undefined,
    staleTime: 5 * 60_000,
  });

  if (artist.isPending) return <DetailSkeleton />;
  if (artist.isError)
    return (
      <DetailError
        notFound={isApiError(artist.error, 404) || isApiError(artist.error, 400)}
        what="artist"
      />
    );

  const a = artist.data;
  const discography = albums.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <>
      <header className="flex flex-col items-start gap-5 sm:flex-row sm:items-end sm:gap-8">
        <Artwork
          images={a.images}
          size={232}
          seed={a.uri}
          alt={a.name}
          className="size-40 sm:size-[232px] rounded-full shadow-art"
        />
        <div className="flex min-w-0 flex-col gap-3">
          <p className="text-overline uppercase text-accent-hover">Artist</p>
          <h1 className="line-clamp-2 text-h1 sm:text-display">{a.name}</h1>
          {a.genres && a.genres.length > 0 && (
            <p className="text-body capitalize text-text-secondary">
              {a.genres.slice(0, 3).join(' · ')}
            </p>
          )}
          <div className="pt-2">
            <Button
              onClick={() => controls.playContext(a.uri)}
              disabled={!controls.canControl}
              aria-label={`Play ${a.name}`}
              icon={<Play aria-hidden className="size-4 fill-current" />}
            >
              Play
            </Button>
          </div>
        </div>
      </header>

      <section aria-labelledby="discography-heading" className="flex flex-col gap-4">
        <h2 id="discography-heading" className="text-h2">
          Discography
        </h2>
        {albums.isPending ? (
          <div className="flex gap-5" aria-busy="true">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="h-[236px] w-[184px] animate-pulse rounded-xl bg-surface" />
            ))}
          </div>
        ) : albums.isError ? (
          <p className="text-text-secondary">Couldn&apos;t load releases.</p>
        ) : discography.length === 0 ? (
          <p className="text-text-secondary">No releases found.</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(184px,1fr))] sm:gap-5">
              {discography.map((al) => (
                <AlbumCard
                  fluid
                  key={al.uri}
                  title={al.name}
                  subtitle={[
                    al.releaseDate?.slice(0, 4),
                    al.albumType === 'single' ? 'Single' : 'Album',
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                  images={al.images}
                  seed={al.uri}
                  to={albumPath(al.uri) ?? undefined}
                  onPlay={() => controls.playContext(al.uri)}
                />
              ))}
            </div>
            <LoadMore
              hasMore={albums.hasNextPage}
              loading={albums.isFetchingNextPage}
              onClick={() => void albums.fetchNextPage()}
              label="Load more releases"
            />
          </>
        )}
      </section>
    </>
  );
}
