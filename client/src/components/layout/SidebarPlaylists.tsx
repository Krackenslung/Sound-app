import { NavLink } from 'react-router';
import { Heart } from 'lucide-react';
import { Artwork } from '@/components/media/Artwork';
import { useLikedTracks, useMyPlaylists } from '@/features/library/queries';
import { cn } from '@/lib/cn';

const rowCls = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors',
    isActive ? 'bg-surface-2' : 'hover:bg-surface-2',
  );

// Figma: Sidebar playlists (node 4:69) — Liked Songs first, then the user's playlists.
export function SidebarPlaylists() {
  const playlists = useMyPlaylists();
  const liked = useLikedTracks();
  const likedTotal = liked.data?.pages[0]?.total;
  const items = playlists.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <nav aria-label="Your playlists" className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
      <NavLink to="/library" end className={rowCls}>
        <span
          className="flex size-10 shrink-0 items-center justify-center rounded-md"
          style={{ backgroundImage: 'var(--art-liked)' }}
        >
          <Heart aria-hidden className="size-4 text-on-accent" />
        </span>
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate text-body font-semibold">Liked Songs</span>
          <span className="truncate text-caption text-text-secondary">
            Playlist{likedTotal != null ? ` · ${likedTotal} songs` : ''}
          </span>
        </span>
      </NavLink>
      {playlists.isError && (
        <p className="px-2 text-caption text-text-muted">Couldn&apos;t load playlists.</p>
      )}
      {items.map((p) =>
        p.id.startsWith('pending-') ? (
          <div key={p.id} className="flex items-center gap-3 px-2 py-1.5 opacity-60">
            <div className="size-10 shrink-0 animate-pulse rounded-md bg-surface-2" />
            <span className="truncate text-body font-semibold">{p.name}</span>
          </div>
        ) : (
          <NavLink key={p.id} to={`/playlist/${p.id}`} className={rowCls}>
            <Artwork images={p.images} size={40} seed={p.uri} className="size-10 rounded-md" />
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="truncate text-body font-semibold">{p.name}</span>
              <span className="truncate text-caption text-text-secondary">
                Playlist{p.totalItems != null ? ` · ${p.totalItems} songs` : ''}
              </span>
            </span>
          </NavLink>
        ),
      )}
    </nav>
  );
}
