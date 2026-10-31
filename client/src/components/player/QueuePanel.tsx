import { useQuery } from '@tanstack/react-query';
import { Laptop, Speaker } from 'lucide-react';
import { playerApi } from '@/api/player';
import { TrackRow } from '@/components/tracks/TrackRow';
import { apiTrackToPlayerTrack } from '@/features/player/mappers';
import { useTrackMenu } from '@/features/tracks/useTrackMenu';
import { artistNames } from '@/lib/format';
import { usePlayerStore } from '@/store/playerStore';

const MAX_QUEUE = 20;

const Overline = ({ children }: { children: React.ReactNode }) => (
  <p className="text-overline uppercase text-text-muted">{children}</p>
);

// Figma: Queue panel on 03 · Now Playing (node 6:495).
export function QueuePanel() {
  const track = usePlayerStore((s) => s.track);
  const sdkNext = usePlayerStore((s) => s.nextTracks);
  const activeDevice = usePlayerStore((s) => s.activeDevice);
  const trackMenu = useTrackMenu();

  const queue = useQuery({
    queryKey: ['player', 'queue', track?.uri],
    queryFn: playerApi.queue,
    enabled: Boolean(track),
    refetchInterval: 15_000,
  });

  // Prefer the Web API queue; fall back to the SDK's track window if it isn't available.
  const next = queue.data ? queue.data.queue.map(apiTrackToPlayerTrack) : sdkNext;
  const DeviceIcon = activeDevice?.isLocal ? Laptop : Speaker;

  return (
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

      {track && (
        <>
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
        </>
      )}

      <Overline>Next up</Overline>
      {queue.isPending && next.length === 0 ? (
        <div className="flex flex-col gap-2" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-lg bg-surface-2" />
          ))}
        </div>
      ) : next.length === 0 ? (
        <p className="px-4 text-caption text-text-secondary">Nothing queued up next.</p>
      ) : (
        <ol className="flex flex-col">
          {next.slice(0, MAX_QUEUE).map((t, i) => (
            <li key={`${t.uri}-${i}`}>
              <TrackRow
                index={i + 1}
                uri={t.uri}
                title={t.name}
                artist={artistNames(t.artists)}
                album={t.album.name}
                durationMs={t.durationMs}
                images={t.album.images}
                hideAlbum
                menuItems={trackMenu(t).filter((m) => m.label !== 'Add to queue')}
              />
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
