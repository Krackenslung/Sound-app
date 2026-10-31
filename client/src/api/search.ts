import { api } from './client';
import type { AlbumSummary, Artist, OffsetPage, PlaylistSummary, Track } from './types';

export type SearchType = 'track' | 'album' | 'artist' | 'playlist';

export interface SearchResultMap {
  track: Track;
  album: AlbumSummary;
  artist: Artist;
  playlist: PlaylistSummary;
}

export function search<T extends SearchType>(
  q: string,
  type: T,
  offset = 0,
): Promise<OffsetPage<SearchResultMap[T]> & { type: T }> {
  const params = new URLSearchParams({ q, type, offset: String(offset) });
  return api(`/search?${params}`);
}
