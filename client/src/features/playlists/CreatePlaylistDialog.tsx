import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { useAddToPlaylist, useCreatePlaylist } from '@/features/library/queries';
import { useUiStore } from '@/store/uiStore';

const inputCls =
  'w-full rounded-xl border-[1.5px] border-border bg-surface px-4 py-3 text-body text-text-primary placeholder:text-text-muted transition-colors focus:border-accent focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0';

function CreatePlaylistForm({ onDone }: { onDone: () => void }) {
  const withUris = useUiStore((s) => s.createPlaylistWithUris);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const create = useCreatePlaylist();
  const add = useAddToPlaylist();
  const navigate = useNavigate();
  const trimmed = name.trim();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!trimmed) return;
    create.mutate(
      { name: trimmed, description: description.trim() || undefined },
      {
        onSuccess: (playlist) => {
          if (withUris?.length) add.mutate({ playlist, uris: withUris });
          onDone();
          navigate(`/playlist/${playlist.id}`);
        },
      },
    );
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="text-caption text-text-secondary">Name</span>
        <input
          data-autofocus
          value={name}
          maxLength={100}
          onChange={(e) => setName(e.target.value)}
          placeholder="My playlist"
          className={inputCls}
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-caption text-text-secondary">Description (optional)</span>
        <textarea
          value={description}
          maxLength={300}
          rows={3}
          onChange={(e) => setDescription(e.target.value)}
          className={`${inputCls} resize-none`}
        />
      </label>
      <div className="flex justify-end gap-2 pt-1">
        <Button variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" disabled={!trimmed || create.isPending}>
          {create.isPending ? 'Creating…' : 'Create'}
        </Button>
      </div>
    </form>
  );
}

export function CreatePlaylistDialog() {
  const open = useUiStore((s) => s.createPlaylistOpen);
  const close = useUiStore((s) => s.closeCreatePlaylist);
  return (
    <Dialog
      open={open}
      title="New playlist"
      description="It'll appear in your Spotify library right away."
      onClose={close}
    >
      {/* Remount on open so the form starts empty. */}
      {open && <CreatePlaylistForm onDone={close} />}
    </Dialog>
  );
}
