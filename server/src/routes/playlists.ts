import { Router, type Request } from 'express';
import type { AppConfig } from '../config.js';
import { HttpError } from '../middleware/errorHandler.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { TRACK_URI, idParam, intParam, stringField, uriList } from '../middleware/validate.js';
import { createSpotifyClient } from '../spotify/spotifyClient.js';
import {
  playlistEntryTrack,
  toPlaylistSummary,
  toTrack,
  type PlaylistSummaryDto,
} from '../spotify/mappers.js';
import type {
  SpotifyPaging,
  SpotifyPlaylistEntry,
  SpotifyPlaylistSummary,
} from '../spotify/types.js';
import { getUserId } from '../spotify/userId.js';
import { asUnavailable } from '../spotify/unavailable.js';
import { collectLikedSince, monthLabel, parseMonth } from '../spotify/likedTracks.js';

const PAGE = 50;
const MAX_ADD = 100;

export interface MyPlaylistDto extends PlaylistSummaryDto {
  isOwner: boolean;
  /** Owned or collaborative: items can be read and edited (Development Mode restriction). */
  editable: boolean;
}

function withOwnership(p: SpotifyPlaylistSummary, userId: string): MyPlaylistDto {
  const dto = toPlaylistSummary(p);
  const isOwner = dto.ownerId === userId;
  return { ...dto, isOwner, editable: isOwner || dto.collaborative };
}

export function createPlaylistsRouter(config: AppConfig) {
  const router = Router();
  router.use(requireAuth);
  const client = (req: Request) => createSpotifyClient(req, config);

  /** The current user's playlists (GET /me/playlists; /users/{id}/playlists is gone). */
  router.get('/', async (req, res, next) => {
    try {
      const offset = intParam(req.query.offset, {
        name: 'offset',
        min: 0,
        max: 100_000,
        fallback: 0,
      });
      const [userId, page] = await Promise.all([
        getUserId(req, config),
        client(req).request<SpotifyPaging<SpotifyPlaylistSummary | null>>(
          `/me/playlists?limit=${PAGE}&offset=${offset}`,
        ),
      ]);
      res.set('Cache-Control', 'no-store');
      res.json({
        items: page.items
          .filter((p): p is SpotifyPlaylistSummary => !!p)
          .map((p) => withOwnership(p, userId)),
        offset,
        total: page.total ?? null,
        nextOffset: page.next ? offset + PAGE : null,
      });
    } catch (err) {
      next(err);
    }
  });

  router.post('/', async (req, res, next) => {
    try {
      const name = stringField(req.body?.name, 'name', { min: 1, max: 100 })!;
      const description = stringField(req.body?.description, 'description', { max: 300 });
      const isPublic = req.body?.public === true;
      const [userId, created] = await Promise.all([
        getUserId(req, config),
        client(req).request<SpotifyPlaylistSummary>('/me/playlists', {
          method: 'POST',
          body: JSON.stringify({ name, public: isPublic, ...(description ? { description } : {}) }),
        }),
      ]);
      res.status(201).json(withOwnership(created, userId));
    } catch (err) {
      next(err);
    }
  });

  /**
   * "Monthly playlist" generator: every song liked during `month` (UTC), oldest first, in a new
   * playlist. Walks Liked Songs only as far back as needed.
   */
  router.post('/monthly', async (req, res, next) => {
    try {
      const { key, start, end } = parseMonth(req.body?.month);
      const { entries, truncated } = await collectLikedSince(req, config, start);
      const uris = entries
        .filter((e) => new Date(e.addedAt) < end)
        .sort((a, b) => a.addedAt.localeCompare(b.addedAt))
        .map((e) => e.uri);
      const unique = [...new Set(uris)];
      if (unique.length === 0) {
        throw new HttpError(400, 'EMPTY_MONTH', `You didn't like any songs in ${monthLabel(key)}.`);
      }
      const name = `Liked in ${monthLabel(key)}`;
      const [userId, created] = await Promise.all([
        getUserId(req, config),
        client(req).request<SpotifyPlaylistSummary>('/me/playlists', {
          method: 'POST',
          body: JSON.stringify({
            name,
            public: false,
            description: `Songs you liked in ${monthLabel(key)}. Made with Pulse Player.`,
          }),
        }),
      ]);
      for (let i = 0; i < unique.length; i += MAX_ADD) {
        await client(req).request(`/playlists/${created.id}/items`, {
          method: 'POST',
          body: JSON.stringify({ uris: unique.slice(i, i + MAX_ADD) }),
        });
      }
      res.status(201).json({
        playlist: { ...withOwnership(created, userId), totalItems: unique.length },
        added: unique.length,
        truncated,
      });
    } catch (err) {
      next(err);
    }
  });

  router.get('/:id', async (req, res, next) => {
    try {
      const id = idParam(req.params.id);
      const [userId, playlist] = await Promise.all([
        getUserId(req, config),
        client(req).request<SpotifyPlaylistSummary>(`/playlists/${id}`),
      ]);
      res.set('Cache-Control', 'no-store');
      res.json(withOwnership(playlist, userId));
    } catch (err) {
      next(err);
    }
  });

  router.get('/:id/items', async (req, res, next) => {
    try {
      const id = idParam(req.params.id);
      const offset = intParam(req.query.offset, {
        name: 'offset',
        min: 0,
        max: 100_000,
        fallback: 0,
      });
      const page = await client(req).request<SpotifyPaging<SpotifyPlaylistEntry>>(
        `/playlists/${id}/items?limit=${PAGE}&offset=${offset}`,
      );
      res.set('Cache-Control', 'no-store');
      res.json({
        items: page.items.flatMap((e) => {
          const t = playlistEntryTrack(e);
          return t ? [{ addedAt: e.added_at, track: toTrack(t) }] : [];
        }),
        offset,
        total: page.total ?? null,
        nextOffset: page.next ? offset + PAGE : null,
      });
    } catch (err) {
      next(
        asUnavailable(
          err,
          'Spotify only lets this app show songs from playlists you own or collaborate on.',
        ),
      );
    }
  });

  router.post('/:id/items', async (req, res, next) => {
    try {
      const id = idParam(req.params.id);
      const uris = uriList(req.body?.uris, 'uris', { max: MAX_ADD, pattern: TRACK_URI });
      const r = await client(req).request<{ snapshot_id?: string }>(`/playlists/${id}/items`, {
        method: 'POST',
        body: JSON.stringify({ uris }),
      });
      res.status(201).json({ snapshotId: r?.snapshot_id ?? null });
    } catch (err) {
      next(err);
    }
  });

  router.delete('/:id/items', async (req, res, next) => {
    try {
      const id = idParam(req.params.id);
      const uris = uriList(req.body?.uris, 'uris', { max: MAX_ADD, pattern: TRACK_URI });
      const snapshotId = req.body?.snapshotId;
      if (snapshotId !== undefined && (typeof snapshotId !== 'string' || snapshotId.length > 200)) {
        throw new HttpError(400, 'BAD_REQUEST', 'snapshotId is invalid');
      }
      // Feb 2026: DELETE /playlists/{id}/items takes `items: [{ uri }]` (was `tracks` on /tracks).
      const r = await client(req).request<{ snapshot_id?: string }>(`/playlists/${id}/items`, {
        method: 'DELETE',
        body: JSON.stringify({
          items: uris.map((uri) => ({ uri })),
          ...(snapshotId ? { snapshot_id: snapshotId } : {}),
        }),
      });
      res.json({ snapshotId: r?.snapshot_id ?? null });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
