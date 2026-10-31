import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isApiError } from '@/api/client';
import { createMonthlyPlaylist, fetchLikedMonths } from '@/api/stats';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { libraryKeys } from '@/features/library/queries';
import { cn } from '@/lib/cn';
import { toast } from '@/store/toastStore';
import { useUiStore } from '@/store/uiStore';

const monthName = (key: string) => {
  const [y, m] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
};

function MonthlyForm({ onDone }: { onDone: () => void }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const months = useQuery({ queryKey: ['library', 'months'], queryFn: () => fetchLikedMonths(12) });
  const firstWithSongs = months.data?.items.find((m) => m.count > 0)?.month;
  const [picked, setPicked] = useState<string | null>(null);
  const selected = picked ?? firstWithSongs ?? null;
  const selectedCount = months.data?.items.find((m) => m.month === selected)?.count ?? 0;

  const create = useMutation({
    mutationFn: createMonthlyPlaylist,
    onSuccess: ({ playlist, added }) => {
      queryClient.setQueryData(libraryKeys.playlist(playlist.id), playlist);
      void queryClient.invalidateQueries({ queryKey: libraryKeys.myPlaylists });
      toast(`Created “${playlist.name}” with ${added} songs`, 'success');
      onDone();
      navigate(`/playlist/${playlist.id}`);
    },
    onError: (err) => toast(isApiError(err) ? err.message : "Couldn't create the playlist."),
  });

  if (months.isPending) {
    return (
      <p className="text-body text-text-secondary" role="status">
        Counting your liked songs…
      </p>
    );
  }
  if (months.isError) {
    return (
      <p className="text-body text-text-secondary">
        {isApiError(months.error) && months.error.code === 'ENDPOINT_UNAVAILABLE'
          ? `${months.error.message} The monthly playlist needs that list, so it isn't available right now.`
          : "Couldn't read your Liked Songs."}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        role="radiogroup"
        aria-label="Month"
        className="grid max-h-[300px] grid-cols-2 gap-2 overflow-y-auto"
      >
        {months.data.items.map(({ month, count }) => {
          const isSelected = month === selected;
          return (
            <button
              key={month}
              type="button"
              role="radio"
              aria-checked={isSelected}
              disabled={count === 0}
              onClick={() => setPicked(month)}
              className={cn(
                'flex flex-col items-start rounded-xl border-[1.5px] px-3 py-2.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-40',
                isSelected
                  ? 'border-accent bg-accent-soft'
                  : 'border-border hover:bg-surface-hover',
              )}
            >
              <span className={cn('text-body font-semibold', isSelected && 'text-accent-hover')}>
                {monthName(month)}
              </span>
              <span className="text-caption text-text-secondary">
                {count} {count === 1 ? 'song' : 'songs'}
              </span>
            </button>
          );
        })}
      </div>
      {months.data.truncated && (
        <p className="text-caption text-text-muted">
          Counts stop at your 2,000 most recent liked songs.
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button
          disabled={!selected || selectedCount === 0 || create.isPending}
          onClick={() => selected && create.mutate(selected)}
        >
          {create.isPending
            ? 'Creating…'
            : selected
              ? `Create “Liked in ${monthName(selected)}”`
              : 'Create'}
        </Button>
      </div>
    </div>
  );
}

export function MonthlyPlaylistDialog() {
  const open = useUiStore((s) => s.monthlyPlaylistOpen);
  const close = useUiStore((s) => s.setMonthlyPlaylistOpen);
  return (
    <Dialog
      open={open}
      title="Create a monthly playlist"
      description="Pick a month and we'll gather every song you liked in it (UTC), oldest first."
      onClose={() => close(false)}
    >
      {open && <MonthlyForm onDone={() => close(false)} />}
    </Dialog>
  );
}
