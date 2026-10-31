import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';
import { fetchLikedTracks, fetchSavedAlbums } from '@/api/library';
import {
  addToPlaylist,
  createPlaylist,
  fetchMyPlaylists,
  fetchPlaylist,
  fetchPlaylistItems,
  removeFromPlaylist,
} from '@/api/playlists';
import type { MyPlaylist, OffsetPage, SavedTrack } from '@/api/types';
import { toast } from '@/store/toastStore';
import { likedKey } from './useLiked';

export const libraryKeys = {
  likedTracks: ['library', 'tracks'] as const,
  savedAlbums: ['library', 'albums'] as const,
  myPlaylists: ['playlists', 'mine'] as const,
  playlist: (id: string) => ['playlists', id] as const,
  playlistItems: (id: string) => ['playlists', id, 'items'] as const,
};

type Pages<T> = InfiniteData<OffsetPage<T>, number>;

const nextOffset = (last: OffsetPage<unknown>) => last.nextOffset ?? undefined;

export function useLikedTracks() {
  const queryClient = useQueryClient();
  return useInfiniteQuery({
    queryKey: libraryKeys.likedTracks,
    queryFn: async ({ pageParam }) => {
      const page = await fetchLikedTracks(pageParam);
      // Everything in Liked Songs is liked: seed the heart cache so rows don't each ask.
      page.items.forEach((i) => queryClient.setQueryData(likedKey(i.track.uri), true));
      return page;
    },
    initialPageParam: 0,
    getNextPageParam: nextOffset,
  });
}

export function useSavedAlbums() {
  return useInfiniteQuery({
    queryKey: libraryKeys.savedAlbums,
    queryFn: ({ pageParam }) => fetchSavedAlbums(pageParam),
    initialPageParam: 0,
    getNextPageParam: nextOffset,
  });
}

export function useMyPlaylists() {
  return useInfiniteQuery({
    queryKey: libraryKeys.myPlaylists,
    queryFn: ({ pageParam }) => fetchMyPlaylists(pageParam),
    initialPageParam: 0,
    getNextPageParam: nextOffset,
    staleTime: 60_000,
  });
}

export function usePlaylist(id: string) {
  return useQuery({ queryKey: libraryKeys.playlist(id), queryFn: () => fetchPlaylist(id) });
}

export function usePlaylistItems(id: string, enabled = true) {
  return useInfiniteQuery({
    queryKey: libraryKeys.playlistItems(id),
    queryFn: ({ pageParam }) => fetchPlaylistItems(id, pageParam),
    initialPageParam: 0,
    getNextPageParam: nextOffset,
    enabled,
  });
}

/** Create a playlist; it shows up in the list immediately and is rolled back on error. */
export function useCreatePlaylist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createPlaylist,
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: libraryKeys.myPlaylists });
      const previous = queryClient.getQueryData<Pages<MyPlaylist>>(libraryKeys.myPlaylists);
      const placeholder: MyPlaylist = {
        id: `pending-${Date.now()}`,
        uri: '',
        name: input.name,
        description: input.description ?? null,
        images: [],
        ownerId: null,
        ownerName: null,
        collaborative: false,
        totalItems: 0,
        isOwner: true,
        editable: false,
      };
      if (previous) {
        queryClient.setQueryData<Pages<MyPlaylist>>(libraryKeys.myPlaylists, {
          ...previous,
          pages: previous.pages.map((p, i) =>
            i === 0 ? { ...p, items: [placeholder, ...p.items] } : p,
          ),
        });
      }
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      queryClient.setQueryData(libraryKeys.myPlaylists, ctx?.previous);
      toast("Couldn't create the playlist.");
    },
    onSuccess: (created) => {
      queryClient.setQueryData(libraryKeys.playlist(created.id), created);
      toast(`Created “${created.name}”`, 'success');
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: libraryKeys.myPlaylists }),
  });
}

function bumpCount(queryClient: ReturnType<typeof useQueryClient>, id: string, delta: number) {
  const bump = (p: MyPlaylist) =>
    p.id === id && p.totalItems != null
      ? { ...p, totalItems: Math.max(0, p.totalItems + delta) }
      : p;
  queryClient.setQueryData<MyPlaylist>(libraryKeys.playlist(id), (p) => (p ? bump(p) : p));
  queryClient.setQueryData<Pages<MyPlaylist>>(libraryKeys.myPlaylists, (data) =>
    data
      ? { ...data, pages: data.pages.map((pg) => ({ ...pg, items: pg.items.map(bump) })) }
      : data,
  );
}

export function useAddToPlaylist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ playlist, uris }: { playlist: MyPlaylist; uris: string[] }) =>
      addToPlaylist(playlist.id, uris),
    onMutate: ({ playlist, uris }) => {
      bumpCount(queryClient, playlist.id, uris.length);
    },
    onError: (_e, { playlist, uris }) => {
      bumpCount(queryClient, playlist.id, -uris.length);
      toast(`Couldn't add to “${playlist.name}”.`);
    },
    onSuccess: (_d, { playlist }) => toast(`Added to “${playlist.name}”`, 'success'),
    onSettled: (_d, _e, { playlist }) =>
      queryClient.invalidateQueries({ queryKey: libraryKeys.playlistItems(playlist.id) }),
  });
}

/** Remove a track from a playlist with an optimistic row removal and rollback on error. */
export function useRemoveFromPlaylist(playlistId: string) {
  const queryClient = useQueryClient();
  const key = libraryKeys.playlistItems(playlistId);
  return useMutation({
    mutationFn: (uri: string) => removeFromPlaylist(playlistId, [uri]),
    onMutate: async (uri) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Pages<SavedTrack>>(key);
      queryClient.setQueryData<Pages<SavedTrack>>(key, (data) =>
        data
          ? {
              ...data,
              // Spotify removes every occurrence of the URI, so do the same.
              pages: data.pages.map((p) => ({
                ...p,
                items: p.items.filter((i) => i.track.uri !== uri),
              })),
            }
          : data,
      );
      bumpCount(queryClient, playlistId, -1);
      return { previous };
    },
    onError: (_e, _uri, ctx) => {
      queryClient.setQueryData(key, ctx?.previous);
      bumpCount(queryClient, playlistId, 1);
      toast("Couldn't remove that track.");
    },
    onSuccess: () => toast('Removed from playlist', 'success'),
  });
}
