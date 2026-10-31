import { api } from './client';
import type { Track } from './types';

export interface RecentlyPlayedItem {
  track: Track;
  playedAt: string;
  contextUri: string | null;
}

export type TimeRange = 'short_term' | 'medium_term' | 'long_term';

export const fetchTopTracks = (timeRange: TimeRange = 'short_term', limit = 10) =>
  api<{ items: Track[] }>(`/me/top/tracks?time_range=${timeRange}&limit=${limit}`).then(
    (r) => r.items,
  );

export const fetchRecentlyPlayed = (limit = 20) =>
  api<{ items: RecentlyPlayedItem[] }>(`/me/recently-played?limit=${limit}`).then((r) => r.items);
