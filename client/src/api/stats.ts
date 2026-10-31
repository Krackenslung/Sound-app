import { api } from './client';
import type { TimeRange } from './home';
import type { Artist, MyPlaylist } from './types';

export const fetchTopArtists = (timeRange: TimeRange, limit = 50) =>
  api<{ items: Artist[] }>(`/me/top/artists?time_range=${timeRange}&limit=${limit}`).then(
    (r) => r.items,
  );

export interface LikedMonth {
  month: string; // YYYY-MM (UTC)
  count: number;
}

export const fetchLikedMonths = (months = 12) =>
  api<{ items: LikedMonth[]; truncated: boolean }>(`/library/months?months=${months}`);

export const createMonthlyPlaylist = (month: string) =>
  api<{ playlist: MyPlaylist; added: number; truncated: boolean }>('/playlists/monthly', {
    method: 'POST',
    body: JSON.stringify({ month }),
  });
