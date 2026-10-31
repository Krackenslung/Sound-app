import { create } from 'zustand';

interface UiState {
  devicePickerOpen: boolean;
  setDevicePickerOpen: (open: boolean) => void;
  createPlaylistOpen: boolean;
  /** When set, created playlist gets these tracks added. */
  createPlaylistWithUris: string[] | null;
  openCreatePlaylist: (withUris?: string[]) => void;
  closeCreatePlaylist: () => void;
  /** Track URIs waiting for a playlist choice (Add to playlist dialog), or null. */
  addToPlaylistUris: string[] | null;
  openAddToPlaylist: (uris: string[]) => void;
  closeAddToPlaylist: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  devicePickerOpen: false,
  setDevicePickerOpen: (devicePickerOpen) => set({ devicePickerOpen }),
  createPlaylistOpen: false,
  createPlaylistWithUris: null,
  openCreatePlaylist: (withUris) =>
    set({
      createPlaylistOpen: true,
      createPlaylistWithUris: withUris ?? null,
      addToPlaylistUris: null,
    }),
  closeCreatePlaylist: () => set({ createPlaylistOpen: false, createPlaylistWithUris: null }),
  addToPlaylistUris: null,
  openAddToPlaylist: (uris) => set({ addToPlaylistUris: uris }),
  closeAddToPlaylist: () => set({ addToPlaylistUris: null }),
}));
