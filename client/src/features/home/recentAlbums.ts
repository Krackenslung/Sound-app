import type { RecentlyPlayedItem } from '@/api/home';
import type { AlbumRef } from '@/api/types';

/** Most recent distinct albums from the recently-played list. */
export function recentAlbums(items: RecentlyPlayedItem[], max = 5): AlbumRef[] {
  const seen = new Set<string>();
  const albums: AlbumRef[] = [];
  for (const { track } of items) {
    if (seen.has(track.album.uri)) continue;
    seen.add(track.album.uri);
    albums.push(
      track.album.artists.length ? track.album : { ...track.album, artists: track.artists },
    );
    if (albums.length === max) break;
  }
  return albums;
}
