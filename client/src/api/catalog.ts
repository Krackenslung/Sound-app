import { api } from './client';
import type { Album, AlbumSummary, Artist, OffsetPage } from './types';

export const fetchAlbum = (id: string) => api<Album>(`/albums/${encodeURIComponent(id)}`);
export const fetchArtist = (id: string) => api<Artist>(`/artists/${encodeURIComponent(id)}`);
export const fetchArtistAlbums = (id: string, offset = 0) =>
  api<OffsetPage<AlbumSummary>>(`/artists/${encodeURIComponent(id)}/albums?offset=${offset}`);
