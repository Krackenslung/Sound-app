import { useQuery } from '@tanstack/react-query';
import { fetchRecentlyPlayed, fetchTopTracks } from '@/api/home';
import { recentAlbums } from '@/features/home/recentAlbums';
import { AlbumCard } from '@/components/cards/AlbumCard';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { TrackRow } from '@/components/tracks/TrackRow';
import { useAuth } from '@/features/auth/authContext';
import { usePlayerControls } from '@/features/player/playerContext';
import { artistNames } from '@/lib/format';
import { albumPath } from '@/lib/spotifyUri';
import { useTrackMenu } from '@/features/tracks/useTrackMenu';
import { MobileAccountButton } from '@/components/layout/MobileAccountButton';
import { QuickPick } from '@/components/cards/QuickPick';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { usePlayerStore } from '@/store/playerStore';

const RECENT_CARDS = 5; // keep in sync with recentAlbums' default
const TOP_TRACKS = 5;

function greeting(date = new Date()): string {
  const h = date.getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function Notice({ children }: { children: React.ReactNode }) {
  return <p className="text-body text-text-secondary">{children}</p>;
}

// Figma: 02 · Home (node 5:145)
export function HomePage() {
  const { user } = useAuth();
  const controls = usePlayerControls();
  const trackMenu = useTrackMenu();
  const currentUri = usePlayerStore((s) => s.track?.uri);
  const firstName = user?.displayName.split(/\s+/)[0];
  const isMobile = useIsMobile();

  const recent = useQuery({
    queryKey: ['home', 'recently-played'],
    queryFn: () => fetchRecentlyPlayed(30),
  });
  const top = useQuery({
    queryKey: ['home', 'top-tracks'],
    queryFn: () => fetchTopTracks('short_term', TOP_TRACKS),
  });

  const albums = recent.data ? recentAlbums(recent.data) : [];
  const topUris = top.data?.map((t) => t.uri) ?? [];

  return (
    <>
      <header className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-h1">
            {greeting()}
            {firstName && !isMobile ? `, ${firstName}` : ''}
          </h1>
          <p className="hidden text-text-secondary md:block">Pick up where you left off.</p>
        </div>
        <MobileAccountButton />
      </header>

      {isMobile ? (
        <section aria-label="Quick picks" className="grid grid-cols-2 gap-2">
          <QuickPick
            title="Liked Songs"
            to="/library"
            seed="liked"
            art={
              <span
                className="size-[52px] shrink-0"
                style={{ backgroundImage: 'var(--art-liked)' }}
              />
            }
          />
          {albums.slice(0, 3).map((a) => (
            <QuickPick
              key={a.uri}
              title={a.name}
              to={albumPath(a.uri) ?? '/'}
              images={a.images}
              seed={a.uri}
            />
          ))}
        </section>
      ) : (
        <section aria-labelledby="recent-heading" className="flex flex-col gap-4">
          <SectionHeader id="recent-heading" title="Recently played" seeAllTo="/stats" />
          {recent.isPending ? (
            <div className="flex gap-5 overflow-hidden" aria-busy="true">
              {Array.from({ length: RECENT_CARDS }, (_, i) => (
                <div
                  key={i}
                  className="h-[236px] w-[184px] shrink-0 animate-pulse rounded-xl bg-surface"
                />
              ))}
            </div>
          ) : recent.isError ? (
            <Notice>Couldn&apos;t load your recently played music.</Notice>
          ) : albums.length === 0 ? (
            <Notice>Nothing here yet — play something and it will show up.</Notice>
          ) : (
            <div className="flex gap-5 overflow-x-auto pb-1">
              {albums.map((album) => (
                <AlbumCard
                  key={album.uri}
                  title={album.name}
                  subtitle={artistNames(album.artists)}
                  images={album.images}
                  seed={album.uri}
                  to={albumPath(album.uri) ?? undefined}
                  onPlay={() => controls.playContext(album.uri)}
                />
              ))}
            </div>
          )}
        </section>
      )}

      <section aria-labelledby="top-heading" className="flex flex-col gap-2">
        <SectionHeader
          id="top-heading"
          title={isMobile ? 'Your top tracks' : 'Your top tracks this month'}
          seeAllTo={isMobile ? undefined : '/stats'}
        />
        {top.isPending ? (
          <div className="flex flex-col gap-2" aria-busy="true">
            {Array.from({ length: TOP_TRACKS }, (_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-lg bg-surface" />
            ))}
          </div>
        ) : top.isError ? (
          <Notice>Couldn&apos;t load your top tracks.</Notice>
        ) : top.data.length === 0 ? (
          <Notice>Listen a bit more and your top tracks will appear here.</Notice>
        ) : (
          <div className="flex flex-col">
            {top.data.map((t, i) => (
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
                onPlay={() => controls.playTracks(topUris, i)}
                menuItems={trackMenu(t)}
              />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
