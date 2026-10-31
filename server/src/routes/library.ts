import { Router } from 'express';
import type { AppConfig } from '../config.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { TRACK_URI, uriList } from '../middleware/validate.js';
import { createSpotifyClient } from '../spotify/spotifyClient.js';

// Feb 2026 migration: type-specific save/remove/contains endpoints (/me/tracks, /me/tracks/contains)
// were replaced by generic /me/library endpoints that take Spotify URIs.
const MAX_URIS = 40;

export function createLibraryRouter(config: AppConfig) {
  const router = Router();
  router.use(requireAuth);

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
