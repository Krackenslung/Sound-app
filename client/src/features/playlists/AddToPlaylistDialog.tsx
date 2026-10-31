import { Plus } from 'lucide-react';
import { Artwork } from '@/components/media/Artwork';
import { Dialog } from '@/components/ui/Dialog';
import { useAddToPlaylist, useMyPlaylists } from '@/features/library/queries';
import { useUiStore } from '@/store/uiStore';

export function AddToPlaylistDialog() {
  const uris = useUiStore((s) => s.addToPlaylistUris);
  const close = useUiStore((s) => s.closeAddToPlaylist);
  const openCreate = useUiStore((s) => s.openCreatePlaylist);
  const playlists = useMyPlaylists();
  const add = useAddToPlaylist();
  const editable = (playlists.data?.pages.flatMap((p) => p.items) ?? []).filter((p) => p.editable);

  return (
    <Dialog open={uris !== null} title="Add to playlist" onClose={close}>
      <div className="-mx-2 flex max-h-[360px] flex-col gap-1 overflow-y-auto">
        <button
          type="button"
          onClick={() => openCreate(uris ?? undefined)}
          className="flex items-center gap-3 rounded-[10px] p-2 text-left hover:bg-surface-hover"
        >
          <span className="flex size-10 items-center justify-center rounded-md bg-surface-hover">
            <Plus aria-hidden className="size-5" />
          </span>
          <span className="text-body font-semibold">New playlist</span>
        </button>
        {playlists.isPending ? (
          <p className="p-2 text-caption text-text-secondary" role="status">
            Loading your playlists…
          </p>
        ) : playlists.isError ? (
          <p className="p-2 text-caption text-text-secondary">Couldn&apos;t load your playlists.</p>
        ) : editable.length === 0 ? (
          <p className="p-2 text-caption text-text-secondary">
            You don&apos;t have any playlists you can edit yet.
          </p>
        ) : (
          editable.map((p) => (
            <button
              key={p.id}
              type="button"
              disabled={p.id.startsWith('pending-')}
              onClick={() => {
                if (uris) add.mutate({ playlist: p, uris });
                close();
              }}
              className="flex items-center gap-3 rounded-[10px] p-2 text-left hover:bg-surface-hover disabled:opacity-50"
            >
              <Artwork
                images={p.images}
                size={40}
                seed={p.uri || p.id}
                className="size-10 rounded-md"
              />
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-body font-semibold">{p.name}</span>
                <span className="text-caption text-text-secondary">
                  {p.totalItems != null ? `${p.totalItems} songs` : 'Playlist'}
                </span>
              </span>
            </button>
          ))
        )}
      </div>
    </Dialog>
  );
}
