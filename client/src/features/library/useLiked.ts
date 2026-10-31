import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isTrackSaved, removeTracks, saveTracks } from '@/api/library';
import { toast } from '@/store/toastStore';

export const likedKey = (uri: string) => ['library', 'saved', uri] as const;

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
      return { previous };
    },
    onError: (_err, { uri, liked }, ctx) => {
      queryClient.setQueryData(likedKey(uri), ctx?.previous);
      toast(liked ? "Couldn't add to Liked Songs." : "Couldn't remove from Liked Songs.");
    },
    onSuccess: (_d, { liked }) =>
      toast(liked ? 'Added to Liked Songs' : 'Removed from Liked Songs', 'success'),
  });
}
