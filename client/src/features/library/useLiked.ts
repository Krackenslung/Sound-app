import { useMutation, useQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import type { OffsetPage, SavedTrack } from '@/api/types';
import { isTrackSaved, removeTracks, saveTracks } from '@/api/library';
import { toast } from '@/store/toastStore';

export const likedKey = (uri: string) => ['library', 'saved', uri] as const;
/** Same key as libraryKeys.likedTracks (kept here to avoid a circular import). */
const LIKED_LIST_KEY = ['library', 'tracks'] as const;
type LikedPages = InfiniteData<OffsetPage<SavedTrack>, number>;

export const isLikeable = (uri: string | undefined): uri is string =>
  Boolean(uri?.startsWith('spotify:track:'));

export function useIsLiked(uri: string | undefined) {
  return useQuery({
    queryKey: likedKey(uri ?? ''),
    queryFn: () => isTrackSaved(uri!),
    enabled: isLikeable(uri),
    staleTime: 60_000,
  });
}

/** Save/remove a track with an optimistic update and rollback on error. */
export function useToggleLike() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ uri, liked }: { uri: string; liked: boolean }) =>
      liked ? saveTracks([uri]) : removeTracks([uri]),
    onMutate: async ({ uri, liked }) => {
      await queryClient.cancelQueries({ queryKey: likedKey(uri) });
      const previous = queryClient.getQueryData<boolean>(likedKey(uri));
      queryClient.setQueryData(likedKey(uri), liked);
      const previousList = queryClient.getQueryData<LikedPages>(LIKED_LIST_KEY);
      if (!liked && previousList) {
        queryClient.setQueryData<LikedPages>(LIKED_LIST_KEY, {
          ...previousList,
          pages: previousList.pages.map((p, i) => ({
            ...p,
            items: p.items.filter((it) => it.track.uri !== uri),
            total: i === 0 && p.total != null ? p.total - 1 : p.total,
          })),
        });
      }
      return { previous, previousList };
    },
    onError: (_err, { uri, liked }, ctx) => {
      queryClient.setQueryData(likedKey(uri), ctx?.previous);
      if (ctx?.previousList) queryClient.setQueryData(LIKED_LIST_KEY, ctx.previousList);
      toast(liked ? "Couldn't add to Liked Songs." : "Couldn't remove from Liked Songs.");
    },
    onSuccess: (_d, { liked }) =>
      toast(liked ? 'Added to Liked Songs' : 'Removed from Liked Songs', 'success'),
  });
}
