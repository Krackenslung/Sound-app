import { useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { Play } from 'lucide-react';
import { fetchAlbum } from '@/api/catalog';
import { isApiError } from '@/api/client';
import { Artwork } from '@/components/media/Artwork';
import { TrackRow } from '@/components/tracks/TrackRow';
import { Button } from '@/components/ui/Button';
import { EntityLinks } from '@/components/ui/EntityLinks';
import { usePlayerControls } from '@/features/player/playerContext';
import { useTrackMenu } from '@/features/tracks/useTrackMenu';
import { artistNames, formatDuration } from '@/lib/format';
import { artistPath } from '@/lib/spotifyUri';
import { usePlayerStore } from '@/store/playerStore';
import { DetailSkeleton, DetailError } from './detailStates';

const ALBUM_TYPES: Record<string, string> = {
  album: 'Album',
  single: 'Single',
  compilation: 'Compilation',
};

export function AlbumPage() {
  const { id = '' } = useParams();
  const controls = usePlayerControls();
  const trackMenu = useTrackMenu();
  const currentUri = usePlayerStore((s) => s.track?.uri);
  const album = useQuery({
    queryKey: ['album', id],
    queryFn: () => fetchAlbum(id),
    staleTime: 5 * 60_000,
  });

  if (album.isPending) return <DetailSkeleton />;
  if (album.isError)
    return (
      <DetailError
        notFound={isApiError(album.error, 404) || isApiError(album.error, 400)}
        what="album"
      />
    );

  const a = album.data;
  const totalMs = a.tracks.reduce((sum, t) => sum + t.durationMs, 0);
  const meta = [
    a.releaseDate?.slice(0, 4),
    `${a.tracks.length} ${a.tracks.length === 1 ? 'song' : 'songs'}`,
    formatDuration(totalMs),
  ].filter(Boolean);

  return (
    <>
      <header className="flex items-end gap-8">
        <Artwork
          images={a.images}
          size={232}
          seed={a.uri}
          alt={`${a.name} cover`}
          className="size-[232px] rounded-2xl shadow-art"
        />
        <div className="flex min-w-0 flex-col gap-3">
          <p className="text-overline uppercase text-accent-hover">
            {ALBUM_TYPES[a.albumType ?? ''] ?? 'Album'}
          </p>
          <h1 className="line-clamp-2 text-display">{a.name}</h1>
          <p className="text-body text-text-secondary">
            <span className="font-semibold text-text-primary">
              <EntityLinks items={a.artists} pathFor={artistPath} />
            </span>
            {meta.map((m) => ` · ${m}`)}
          </p>
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

      <section aria-label="Tracks" className="flex flex-col">
        {a.tracks.map((t, i) => (
          <TrackRow
            key={`${t.uri}-${i}`}
            index={i + 1}
            uri={t.uri}
            title={t.name}
            artist={artistNames(t.artists)}
            album={a.name}
            durationMs={t.durationMs}
            images={a.images}
            playing={t.uri === currentUri}
            hideAlbum
            onPlay={() => controls.playContext(a.uri, t.uri)}
            menuItems={trackMenu(t, { hideAlbum: true })}
          />
        ))}
      </section>
    </>
  );
}
