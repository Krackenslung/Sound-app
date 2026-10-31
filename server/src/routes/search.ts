import { Router } from 'express';
import type { AppConfig } from '../config.js';
import { HttpError } from '../middleware/errorHandler.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { enumParam, intParam } from '../middleware/validate.js';
import { createSpotifyClient } from '../spotify/spotifyClient.js';
import {
  isTrack,
  toAlbumSummary,
  toArtist,
  toPlaylistSummary,
  toTrack,
} from '../spotify/mappers.js';
import type {
  SpotifyAlbumFull,
  SpotifyArtist,
  SpotifyPaging,
  SpotifyPlaylistSummary,
  SpotifyTrack,
} from '../spotify/types.js';

/** Spotify caps search at 10 results per request for Development Mode apps (Feb 2026). */
export const SEARCH_LIMIT = 10;
const MAX_OFFSET = 990;
const TYPES = ['track', 'album', 'artist', 'playlist'] as const;
type SearchType = (typeof TYPES)[number];

type SearchResponse = Partial<{
  tracks: SpotifyPaging<SpotifyTrack | null>;
  albums: SpotifyPaging<SpotifyAlbumFull | null>;
  artists: SpotifyPaging<SpotifyArtist | null>;
  playlists: SpotifyPaging<SpotifyPlaylistSummary | null>;
}>;

const MAPPERS = {
  track: (r: SearchResponse) =>
    r.tracks && { page: r.tracks, items: r.tracks.items.filter(isTrack).map(toTrack) },
  album: (r: SearchResponse) =>
    r.albums && {
      page: r.albums,
      items: r.albums.items.filter((a): a is SpotifyAlbumFull => !!a).map(toAlbumSummary),
    },
  artist: (r: SearchResponse) =>
    r.artists && {
      page: r.artists,
      items: r.artists.items.filter((a): a is SpotifyArtist => !!a).map(toArtist),
    },
  playlist: (r: SearchResponse) =>
    r.playlists && {
      page: r.playlists,
      // Spotify sometimes returns `null` entries in playlist search results.
      items: r.playlists.items
        .filter((p): p is SpotifyPlaylistSummary => !!p)
        .map(toPlaylistSummary),
    },
} satisfies Record<SearchType, unknown>;

export function createSearchRouter(config: AppConfig) {
  const router = Router();

  router.get('/', requireAuth, async (req, res, next) => {
    try {
      const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
      if (!q) throw new HttpError(400, 'BAD_REQUEST', 'q is required');
      if (q.length > 200) throw new HttpError(400, 'BAD_REQUEST', 'q is too long');
      const type = enumParam(req.query.type, 'type', TYPES, 'track');
      const offset = intParam(req.query.offset, {
        name: 'offset',
        min: 0,
        max: MAX_OFFSET,
        fallback: 0,
      });

      const params = new URLSearchParams({
        q,
        type,
        limit: String(SEARCH_LIMIT),
        offset: String(offset),
      });
      const raw = await createSpotifyClient(req, config).request<SearchResponse>(
        `/search?${params}`,
      );
      const mapped = MAPPERS[type](raw ?? {});
      const total = mapped?.page.total ?? 0;
      res.json({
        type,
        items: mapped?.items ?? [],
        offset,
        total,
        nextOffset:
          mapped?.page.next && offset + SEARCH_LIMIT <= MAX_OFFSET ? offset + SEARCH_LIMIT : null,
      });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
