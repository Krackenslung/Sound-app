import { useSearchParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { fetchRecentlyPlayed, fetchTopTracks, type TimeRange } from '@/api/home';
import { fetchTopArtists } from '@/api/stats';
import { ArtistCard } from '@/components/cards/ArtistCard';
import { BreakdownCard } from '@/components/stats/BreakdownCard';
import { StatTile } from '@/components/stats/StatTile';
import { TrackRow } from '@/components/tracks/TrackRow';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { usePlayerControls } from '@/features/player/playerContext';
import {
  artistBreakdown,
  averageDurationMs,
  genreBreakdown,
  sentenceCase,
} from '@/features/stats/computeStats';
import { useTrackMenu } from '@/features/tracks/useTrackMenu';
import { artistNames, formatDuration, timeAgo } from '@/lib/format';
import { artistPath } from '@/lib/spotifyUri';
import { usePlayerStore } from '@/store/playerStore';

const RANGES: Array<{ value: TimeRange; label: string }> = [
  { value: 'short_term', label: '4 weeks' },
  { value: 'medium_term', label: '6 months' },
  { value: 'long_term', label: 'All time' },
];
const TOP_TRACK_LABEL: Record<TimeRange, string> = {
  short_term: '#1 track this month',
  medium_term: '#1 track · last 6 months',
  long_term: '#1 track of all time',
};
const isRange = (v: string | null): v is TimeRange => RANGES.some((r) => r.value === v);

const Notice = ({ children }: { children: React.ReactNode }) => (
  <p className="text-body text-text-secondary">{children}</p>
);

// Figma: 06 · Stats (node 7:1077)
export function StatsPage() {
  const [params, setParams] = useSearchParams();
  const rangeParam = params.get('range');
  const range: TimeRange = isRange(rangeParam) ? rangeParam : 'short_term';
  const controls = usePlayerControls();
  const trackMenu = useTrackMenu();
  const currentUri = usePlayerStore((s) => s.track?.uri);

  // 50 of each: enough for meaningful genre/length stats; only the first few are shown.
  const artists = useQuery({
    queryKey: ['stats', 'artists', range],
    queryFn: () => fetchTopArtists(range, 50),
  });
  const tracks = useQuery({
    queryKey: ['stats', 'tracks', range],
    queryFn: () => fetchTopTracks(range, 50),
  });
  const recent = useQuery({
    queryKey: ['home', 'recently-played'],
    queryFn: () => fetchRecentlyPlayed(30),
  });

  const genres = artists.data ? genreBreakdown(artists.data) : null;
  // Spotify stopped sending genres to Development Mode apps (Feb 2026): fall back to artists.
  const genresMissing = artists.isSuccess && genres === null;
  const breakdown = genres ?? (genresMissing && tracks.data ? artistBreakdown(tracks.data) : null);
  const avg = tracks.data ? averageDurationMs(tracks.data) : null;
  const topArtists = artists.data?.slice(0, 6) ?? [];
  const topTracks = tracks.data?.slice(0, 5) ?? [];
  const topUris = tracks.data?.map((t) => t.uri) ?? [];
  const artistCount = tracks.data
    ? new Set(tracks.data.flatMap((t) => t.artists.map((a) => a.name))).size
    : null;

  const tilesLoading = artists.isPending || tracks.isPending;

  return (
    <>
      <header className="flex items-center justify-between gap-6">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-h1">Your listening stats</h1>
          <p className="text-text-secondary">Based on your Spotify top items.</p>
        </div>
        <SegmentedControl
          label="Time range"
          options={RANGES}
          value={range}
          onChange={(r) => setParams(r === 'short_term' ? {} : { range: r }, { replace: true })}
        />
      </header>

      {/* Figma: Summary (node 7:1249) */}
      <section aria-label="Summary" className="flex gap-4">
        {genresMissing ? (
          <>
            <StatTile
              tone="accent"
              loading={tilesLoading}
              value={artists.data?.[0]?.name ?? null}
              label="#1 artist"
            />
            <StatTile
              tone="pink"
              loading={tilesLoading}
              value={artistCount != null ? String(artistCount) : null}
              label="artists in your top tracks"
            />
          </>
        ) : (
          <>
            <StatTile
              tone="accent"
              loading={tilesLoading}
              value={genres?.items[0] ? sentenceCase(genres.items[0].label) : null}
              label="top genre"
            />
            <StatTile
              tone="pink"
              loading={tilesLoading}
              value={genres ? String(genres.distinct) : null}
              label="genres in your top artists"
            />
          </>
        )}
        <StatTile
          tone="success"
          loading={tilesLoading}
          value={tracks.data?.[0]?.name ?? null}
          label={TOP_TRACK_LABEL[range]}
        />
        <StatTile
          tone="warning"
          loading={tilesLoading}
          value={avg != null ? formatDuration(avg) : null}
          label="avg. top-track length"
        />
      </section>

      {/* Figma: Top artists (node 7:1262) */}
      <section aria-labelledby="top-artists-heading" className="flex flex-col gap-4">
        <h2 id="top-artists-heading" className="text-h2">
          Top artists
        </h2>
        {artists.isPending ? (
          <div className="flex gap-6" aria-busy="true">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="size-[136px] animate-pulse rounded-full bg-surface" />
            ))}
          </div>
        ) : artists.isError ? (
          <Notice>Couldn&apos;t load your top artists.</Notice>
        ) : topArtists.length === 0 ? (
          <Notice>Listen a bit more and your top artists will show up here.</Notice>
        ) : (
          <ol className="flex gap-6 overflow-x-auto pb-1">
            {topArtists.map((a, i) => (
              <li key={a.uri}>
                <ArtistCard
                  name={a.name}
                  subtitle={`#${i + 1}`}
                  images={a.images}
                  seed={a.uri}
                  to={artistPath(a.uri) ?? undefined}
                />
              </li>
            ))}
          </ol>
        )}
      </section>

      {/* Figma: Columns (node 7:1289) */}
      <div className="flex items-start gap-6">
        <section
          aria-labelledby="top-tracks-heading"
          className="flex min-w-0 flex-1 flex-col gap-1"
        >
          <h2 id="top-tracks-heading" className="text-h2">
            Top tracks
          </h2>
          {tracks.isPending ? (
            <div className="flex flex-col gap-2" aria-busy="true">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="h-14 animate-pulse rounded-lg bg-surface" />
              ))}
            </div>
          ) : tracks.isError ? (
            <Notice>Couldn&apos;t load your top tracks.</Notice>
          ) : topTracks.length === 0 ? (
            <Notice>No top tracks yet for this period.</Notice>
          ) : (
            topTracks.map((t, i) => (
              <TrackRow
                key={t.uri}
                index={i + 1}
                uri={t.uri}
                title={t.name}
                artist={artistNames(t.artists)}
                album={t.album.name}
                durationMs={t.durationMs}
                images={t.album.images}
                playing={t.uri === currentUri}
                hideAlbum
                onPlay={() => controls.playTracks(topUris, i)}
                menuItems={trackMenu(t)}
              />
            ))
          )}
        </section>

        <BreakdownCard
          breakdown={breakdown}
          loading={artists.isPending || (genresMissing && tracks.isPending)}
          footnote={
            genresMissing
              ? "Spotify doesn't share genre data with this app, so this shows the artists in your top tracks."
              : 'From the genres of your top artists.'
          }
        />
      </div>

      <section aria-labelledby="recent-heading" className="flex flex-col gap-1">
        <h2 id="recent-heading" className="text-h2">
          Recently played
        </h2>
        {recent.isPending ? (
          <div className="h-14 animate-pulse rounded-lg bg-surface" aria-busy="true" />
        ) : recent.isError ? (
          <Notice>Couldn&apos;t load your recently played tracks.</Notice>
        ) : recent.data.length === 0 ? (
          <Notice>Nothing played recently.</Notice>
        ) : (
          recent.data
            .slice(0, 10)
            .map(({ track: t, playedAt }, i) => (
              <TrackRow
                key={`${t.uri}-${playedAt}`}
                index={i + 1}
                uri={t.uri}
                title={t.name}
                artist={`${artistNames(t.artists)} · ${timeAgo(playedAt)}`}
                album={t.album.name}
                durationMs={t.durationMs}
                images={t.album.images}
                playing={t.uri === currentUri}
                onPlay={() => controls.playTracks([t.uri])}
                menuItems={trackMenu(t)}
              />
            ))
        )}
      </section>
    </>
  );
}
