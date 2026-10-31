import { Router } from 'express';
import type { AppConfig } from '../config.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { TRACK_URI, intParam, uriList } from '../middleware/validate.js';
import { toAlbumSummary, toTrack, isTrack } from '../spotify/mappers.js';
import type { SpotifyPaging, SpotifySavedAlbum, SpotifySavedTrack } from '../spotify/types.js';
import { asUnavailable } from '../spotify/unavailable.js';
import { collectLikedSince, monthOf } from '../spotify/likedTracks.js';
import { createSpotifyClient } from '../spotify/spotifyClient.js';

// Feb 2026 migration: type-specific save/remove/contains endpoints (/me/tracks, /me/tracks/contains)
// were replaced by generic /me/library endpoints that take Spotify URIs.
const MAX_URIS = 40;
const PAGE = 50;

export function createLibraryRouter(config: AppConfig) {
  const router = Router();
  router.use(requireAuth);

  // GET /me/tracks is deprecated after the Feb 2026 changes and may be unavailable for Development
  // Mode apps; asUnavailable() turns that into ENDPOINT_UNAVAILABLE for the client.
  router.get('/tracks', async (req, res, next) => {
    try {
      const offset = intParam(req.query.offset, {
        name: 'offset',
        min: 0,
        max: 100_000,
        fallback: 0,
      });
      const page = await createSpotifyClient(req, config).request<SpotifyPaging<SpotifySavedTrack>>(
        `/me/tracks?limit=${PAGE}&offset=${offset}`,
      );
      res.set('Cache-Control', 'no-store');
      res.json({
        items: page.items
          .filter((i) => isTrack(i.track))
          .map((i) => ({ addedAt: i.added_at, track: toTrack(i.track) })),
        offset,
        total: page.total ?? null,
        nextOffset: page.next ? offset + PAGE : null,
      });
    } catch (err) {
      next(asUnavailable(err, "Spotify doesn't currently let this app list your Liked Songs."));
    }
  });

  router.get('/albums', async (req, res, next) => {
    try {
      const offset = intParam(req.query.offset, {
        name: 'offset',
        min: 0,
        max: 100_000,
        fallback: 0,
      });
      const page = await createSpotifyClient(req, config).request<SpotifyPaging<SpotifySavedAlbum>>(
        `/me/albums?limit=${PAGE}&offset=${offset}`,
      );
      res.set('Cache-Control', 'no-store');
      res.json({
        items: page.items.map((i) => toAlbumSummary(i.album)),
        offset,
        total: page.total ?? null,
        nextOffset: page.next ? offset + PAGE : null,
      });
    } catch (err) {
      next(asUnavailable(err, "Spotify doesn't currently let this app list your saved albums."));
    }
  });

  /** Liked-song counts per month (UTC) for the last `months` months, newest first. */
  router.get('/months', async (req, res, next) => {
    try {
      const months = intParam(req.query.months, { name: 'months', min: 1, max: 24, fallback: 12 });
      const now = new Date();
      const since = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (months - 1), 1));
      const { entries, truncated } = await collectLikedSince(req, config, since);
      const counts = new Map<string, number>();
      for (const e of entries)
        counts.set(monthOf(e.addedAt), (counts.get(monthOf(e.addedAt)) ?? 0) + 1);
      const items = Array.from({ length: months }, (_, i) => {
        const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
        const key = d.toISOString().slice(0, 7);
        return { month: key, count: counts.get(key) ?? 0 };
      });
      res.set('Cache-Control', 'no-store');
      res.json({ items, truncated });
    } catch (err) {
      next(err);
    }
  });

  router.get('/contains', async (req, res, next) => {
    try {
      const uris = uriList(req.query.uris, 'uris', { max: MAX_URIS, pattern: TRACK_URI });
      const result = await createSpotifyClient(req, config).request<boolean[]>(
        `/me/library/contains?uris=${encodeURIComponent(uris.join(','))}`,
      );
      res.set('Cache-Control', 'no-store');
      res.json(Object.fromEntries(uris.map((u, i) => [u, Boolean(result?.[i])])));
    } catch (err) {
      next(err);
    }
  });

  for (const method of ['PUT', 'DELETE'] as const) {
    router[method === 'PUT' ? 'put' : 'delete']('/', async (req, res, next) => {
      try {
        const uris = uriList(req.body?.uris, 'uris', { max: MAX_URIS, pattern: TRACK_URI });
        await createSpotifyClient(req, config).request(
          `/me/library?uris=${encodeURIComponent(uris.join(','))}`,
          { method },
        );
        res.status(204).end();
      } catch (err) {
        next(err);
      }
    });
  }

  return router;
}
