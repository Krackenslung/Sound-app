import type { Request } from 'express';
import type { AppConfig } from '../config.js';
import { HttpError } from '../middleware/errorHandler.js';
import { createSpotifyClient } from './spotifyClient.js';
import { isTrack } from './mappers.js';
import type { SpotifyPaging, SpotifySavedTrack } from './types.js';
import { asUnavailable } from './unavailable.js';

const PAGE = 50;
/** Hard cap on pages walked per request (2,000 liked songs) to protect the shared API quota. */
export const MAX_LIKED_PAGES = 40;

export interface LikedEntry {
  addedAt: string;
  uri: string;
}

/**
 * Walks Liked Songs newest-first (Spotify's order) until an entry is older than `since`,
 * there are no more pages, or the page cap is hit.
 */
export async function collectLikedSince(
  req: Request,
  config: AppConfig,
  since: Date,
): Promise<{ entries: LikedEntry[]; truncated: boolean }> {
  const client = createSpotifyClient(req, config);
  const entries: LikedEntry[] = [];
  for (let page = 0; page < MAX_LIKED_PAGES; page++) {
    let res: SpotifyPaging<SpotifySavedTrack>;
    try {
      res = await client.request(`/me/tracks?limit=${PAGE}&offset=${page * PAGE}`);
    } catch (err) {
      throw asUnavailable(err, "Spotify doesn't currently let this app read your Liked Songs.");
    }
    for (const i of res.items) {
      if (new Date(i.added_at) < since) return { entries, truncated: false };
      if (isTrack(i.track)) entries.push({ addedAt: i.added_at, uri: i.track.uri });
    }
    if (!res.next) return { entries, truncated: false };
  }
  return { entries, truncated: true };
}

/** `YYYY-MM` (UTC) of an ISO timestamp. */
export const monthOf = (iso: string) => iso.slice(0, 7);

const MONTH = /^(\d{4})-(0[1-9]|1[0-2])$/;

export function parseMonth(raw: unknown): { start: Date; end: Date; key: string } {
  if (typeof raw !== 'string' || !MONTH.test(raw)) {
    throw new HttpError(400, 'BAD_REQUEST', 'month must look like YYYY-MM');
  }
  const [y, m] = raw.split('-').map(Number);
  return { key: raw, start: new Date(Date.UTC(y, m - 1, 1)), end: new Date(Date.UTC(y, m, 1)) };
}

export function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}
