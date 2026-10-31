import { api } from './client';
import type { MyPlaylist, OffsetPage, SavedTrack } from './types';

const enc = encodeURIComponent;

export const fetchMyPlaylists = (offset = 0) =>
  api<OffsetPage<MyPlaylist>>(`/playlists?offset=${offset}`);

export const fetchPlaylist = (id: string) => api<MyPlaylist>(`/playlists/${enc(id)}`);

export const fetchPlaylistItems = (id: string, offset = 0) =>
  api<OffsetPage<SavedTrack>>(`/playlists/${enc(id)}/items?offset=${offset}`);

export const createPlaylist = (input: { name: string; description?: string }) =>
  api<MyPlaylist>('/playlists', { method: 'POST', body: JSON.stringify(input) });

export const addToPlaylist = (id: string, uris: string[]) =>
  api<{ snapshotId: string | null }>(`/playlists/${enc(id)}/items`, {
    method: 'POST',
    body: JSON.stringify({ uris }),
  });

export const removeFromPlaylist = (id: string, uris: string[]) =>
  api<{ snapshotId: string | null }>(`/playlists/${enc(id)}/items`, {
    method: 'DELETE',
    body: JSON.stringify({ uris }),
  });
