import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Play, Search as SearchIcon, X } from 'lucide-react';
import { search, type SearchResultMap, type SearchType } from '@/api/search';
import type { Track } from '@/api/types';
import { AlbumCard } from '@/components/cards/AlbumCard';
import { ArtistCard } from '@/components/cards/ArtistCard';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { Artwork } from '@/components/media/Artwork';
import { TrackRow } from '@/components/tracks/TrackRow';
import { Chip } from '@/components/ui/Chip';
import { EntityLinks } from '@/components/ui/EntityLinks';
import { LoadMore } from '@/components/ui/LoadMore';
import { usePlayerControls } from '@/features/player/playerContext';
import { useTrackMenu } from '@/features/tracks/useTrackMenu';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { artistNames } from '@/lib/format';
import { albumPath, artistPath } from '@/lib/spotifyUri';
import { usePlayerStore } from '@/store/playerStore';

const FILTERS: Array<[SearchType, string]> = [
  ['track', 'Tracks'],
  ['album', 'Albums'],
  ['artist', 'Artists'],
  ['playlist', 'Playlists'],
];
const isSearchType = (v: string | null): v is SearchType => FILTERS.some(([t]) => t === v);
const GRID = 'grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(184px,1fr))] sm:gap-5';

function useSearchResults<T extends SearchType>(q: string, type: T, enabled = true) {
  return useInfiniteQuery({
    queryKey: ['search', type, q],
    queryFn: ({ pageParam }) => search(q, type, pageParam),
    initialPageParam: 0,
    getNextPageParam: (last) => last.nextOffset ?? undefined,
    enabled: enabled && q.length > 0,
    staleTime: 60_000,
    select: (data) => ({
      items: data.pages.flatMap((p) => p.items) as SearchResultMap[T][],
      total: data.pages[0]?.total ?? 0,
    }),
  });
}

const Notice = ({ children }: { children: React.ReactNode }) => (
  <p className="text-body text-text-secondary">{children}</p>
);

function TopResult({ track, onPlay }: { track: Track; onPlay: () => void }) {
  return (
    <section
      aria-labelledby="top-result-heading"
      className="flex w-full shrink-0 flex-col gap-3.5 lg:w-[360px]"
    >
      <h2 id="top-result-heading" className="text-h2">
        Top result
      </h2>
      <div className="flex flex-col gap-4 rounded-[14px] bg-surface p-5">
        <Artwork
          images={track.album.images}
          size={112}
          seed={track.album.uri}
          className="size-28 rounded-[10px]"
        />
        <p className="truncate text-h1">{track.name}</p>
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="shrink-0 rounded-md bg-surface-hover px-2 py-[3px] text-overline uppercase">
              Song
            </span>
            <span className="truncate text-body font-semibold text-text-secondary">
              <EntityLinks items={track.artists} pathFor={artistPath} />
            </span>
          </div>
          <button
            type="button"
            aria-label={`Play ${track.name}`}
            onClick={onPlay}
            className="flex size-12 shrink-0 items-center justify-center rounded-full bg-accent text-on-accent transition-colors hover:bg-accent-strong-hover"
          >
            <Play aria-hidden className="ml-0.5 size-5 fill-current" />
          </button>
        </div>
      </div>
    </section>
  );
}

function TrackResults({ q, onSeeAlbums }: { q: string; onSeeAlbums: () => void }) {
  const controls = usePlayerControls();
  const trackMenu = useTrackMenu();
  const currentUri = usePlayerStore((s) => s.track?.uri);
  const tracks = useSearchResults(q, 'track');
  const albums = useSearchResults(q, 'album');

  if (tracks.isPending) return <ResultsSkeleton />;
  if (tracks.isError) return <Notice>Search failed. Please try again.</Notice>;
  const items = tracks.data.items;
  if (items.length === 0) return <Notice>No songs found for “{q}”.</Notice>;
  const uris = items.map((t) => t.uri);

  return (
    <>
      <div className="flex flex-col items-stretch gap-6 lg:flex-row lg:items-start">
        <TopResult track={items[0]} onPlay={() => controls.playTracks([items[0].uri])} />
        <section aria-labelledby="songs-heading" className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-center justify-between">
            <h2 id="songs-heading" className="text-h2">
              Songs
            </h2>
            <span className="text-caption text-text-muted">
              1–{items.length} of {tracks.data.total.toLocaleString()}
            </span>
          </div>
          {items.map((t, i) => (
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
              hideAlbum
              onPlay={() => controls.playTracks(uris, i)}
              menuItems={trackMenu(t)}
            />
          ))}
          <div className="pt-2">
            <LoadMore
              hasMore={tracks.hasNextPage}
              loading={tracks.isFetchingNextPage}
              onClick={() => void tracks.fetchNextPage()}
            />
          </div>
        </section>
      </div>

      {albums.data && albums.data.items.length > 0 && (
        <section aria-labelledby="albums-heading" className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 id="albums-heading" className="text-h2">
              Albums
            </h2>
            <button
              type="button"
              onClick={onSeeAlbums}
              className="rounded text-body font-semibold text-text-secondary hover:text-text-primary"
            >
              See all
            </button>
          </div>
          <div className="flex gap-5 overflow-x-auto pb-1">
            {albums.data.items.slice(0, 5).map((a) => (
              <AlbumCard
                key={a.uri}
                title={a.name}
                subtitle={`Album · ${artistNames(a.artists)}`}
                images={a.images}
                seed={a.uri}
                to={albumPath(a.uri) ?? undefined}
                onPlay={() => controls.playContext(a.uri)}
              />
            ))}
          </div>
        </section>
      )}
    </>
  );
}

function GridResults({ q, type }: { q: string; type: Exclude<SearchType, 'track'> }) {
  const controls = usePlayerControls();
  const results = useSearchResults(q, type);
  if (results.isPending) return <ResultsSkeleton />;
  if (results.isError) return <Notice>Search failed. Please try again.</Notice>;
  if (results.data.items.length === 0)
    return (
      <Notice>
        No {type}s found for “{q}”.
      </Notice>
    );

  return (
    <section aria-label={`${type} results`} className="flex flex-col gap-5">
      <div className={GRID}>
        {type === 'album' &&
          (results.data.items as SearchResultMap['album'][]).map((a) => (
            <AlbumCard
              fluid
              key={a.uri}
              title={a.name}
              subtitle={[a.releaseDate?.slice(0, 4), artistNames(a.artists)]
                .filter(Boolean)
                .join(' · ')}
              images={a.images}
              seed={a.uri}
              to={albumPath(a.uri) ?? undefined}
              onPlay={() => controls.playContext(a.uri)}
            />
          ))}
        {type === 'artist' &&
          (results.data.items as SearchResultMap['artist'][]).map((a) => (
            <ArtistCard
              key={a.uri}
              name={a.name}
              subtitle="Artist"
              images={a.images}
              seed={a.uri}
              to={artistPath(a.uri) ?? undefined}
            />
          ))}
        {type === 'playlist' &&
          (results.data.items as SearchResultMap['playlist'][]).map((p) => (
            <AlbumCard
              fluid
              key={p.uri}
              title={p.name}
              subtitle={p.ownerName ? `By ${p.ownerName}` : 'Playlist'}
              images={p.images}
              seed={p.uri}
              onPlay={() => controls.playContext(p.uri)}
            />
          ))}
      </div>
      <LoadMore
        hasMore={results.hasNextPage}
        loading={results.isFetchingNextPage}
        onClick={() => void results.fetchNextPage()}
      />
    </section>
  );
}

function ResultsSkeleton() {
  return (
    <div className="flex flex-col gap-2" aria-busy="true" role="status">
      <span className="sr-only">Searching…</span>
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="h-14 animate-pulse rounded-lg bg-surface" />
      ))}
    </div>
  );
}

// Figma: 04 · Search (node 6:639)
export function SearchPage() {
  const [params, setParams] = useSearchParams();
  const urlQ = params.get('q') ?? '';
  const typeParam = params.get('type');
  const type: SearchType = isSearchType(typeParam) ? typeParam : 'track';
  const [input, setInput] = useState(urlQ);
  const debounced = useDebouncedValue(input.trim(), 300);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep the URL in sync with the (debounced) input so searches are shareable/back-able.
  useEffect(() => {
    if (debounced === urlQ) return;
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (debounced) next.set('q', debounced);
        else next.delete('q');
        return next;
      },
      { replace: true },
    );
  }, [debounced, urlQ, setParams]);

  const setType = (t: SearchType) =>
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      if (t === 'track') next.delete('type');
      else next.set('type', t);
      return next;
    });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="sr-only">Search</h1>
      <div className="flex items-center gap-3 rounded-full border-[1.5px] border-border bg-surface-2 px-5 py-3.5 transition-colors focus-within:border-accent">
        <SearchIcon aria-hidden className="size-5 shrink-0" />
        <input
          ref={inputRef}
          type="search"
          autoFocus
          value={input}
          aria-label="Search Spotify"
          placeholder="What do you want to listen to?"
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault();
              setInput('');
            }
          }}
          className="min-w-0 flex-1 bg-transparent text-h3 text-text-primary placeholder:font-medium placeholder:text-text-muted focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 [&::-webkit-search-cancel-button]:hidden"
        />
        {input && (
          <>
            <span className="hidden shrink-0 text-caption text-text-muted sm:inline">
              Esc to clear
            </span>
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => {
                setInput('');
                inputRef.current?.focus();
              }}
              className="rounded-full text-text-secondary hover:text-text-primary sm:hidden"
            >
              <X aria-hidden className="size-4" />
            </button>
          </>
        )}
      </div>

      <div className="flex gap-2 overflow-x-auto" role="group" aria-label="Filter results">
        {FILTERS.map(([t, label]) => (
          <Chip key={t} selected={type === t} onClick={() => setType(t)}>
            {label}
          </Chip>
        ))}
      </div>

      {!urlQ ? (
        <div className="flex flex-col gap-1.5">
          <SectionHeader title="Search" />
          <Notice>Find songs, albums, artists and playlists.</Notice>
        </div>
      ) : type === 'track' ? (
        <TrackResults key={urlQ} q={urlQ} onSeeAlbums={() => setType('album')} />
      ) : (
        <GridResults key={`${type}:${urlQ}`} q={urlQ} type={type} />
      )}
    </div>
  );
}
