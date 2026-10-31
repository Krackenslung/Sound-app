import { Router } from 'express';
import type { AppConfig } from '../config.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { createSpotifyClient } from '../spotify/spotifyClient.js';
import type { SpotifyPaging, SpotifyTrack, SpotifyUser } from '../spotify/types.js';
import { enumParam, intParam } from '../middleware/validate.js';
import { toTrack, type TrackDto } from '../spotify/mappers.js';

export interface MeResponse {
  id: string;
  displayName: string;
  email: string | null;
  /** `null` when Spotify doesn't return it (reported removed for Development Mode apps in Feb 2026). */
  product: string | null;
  country: string | null;
  avatarUrl: string | null;
}

export function toMe(u: SpotifyUser): MeResponse {
  // Pick the smallest image that's at least 64px for the avatar, falling back to the first.
  const images = [...(u.images ?? [])].sort((a, b) => (a.width ?? 0) - (b.width ?? 0));
  const avatar = images.find((i) => (i.width ?? 0) >= 64) ?? images[0];
  return {
    id: u.id,
    displayName: u.display_name || u.id,
    email: u.email ?? null,
    product: u.product ?? null,
    country: u.country ?? null,
    avatarUrl: avatar?.url ?? null,
  };
}

export function createMeRouter(config: AppConfig) {
  const router = Router();
  router.get('/', requireAuth, async (req, res, next) => {
    try {
      const user = await createSpotifyClient(req, config).request<SpotifyUser>('/me');
      res.set('Cache-Control', 'no-store');
      res.json(toMe(user));
    } catch (err) {
      next(err);
    }
  });
  router.get('/top/tracks', requireAuth, async (req, res, next) => {
    try {
      const timeRange = enumParam(
        req.query.time_range,
        'time_range',
        ['short_term', 'medium_term', 'long_term'] as const,
        'short_term',
      );
      const limit = intParam(req.query.limit, { name: 'limit', min: 1, max: 50, fallback: 10 });
      const page = await createSpotifyClient(req, config).request<SpotifyPaging<SpotifyTrack>>(
        `/me/top/tracks?time_range=${timeRange}&limit=${limit}`,
      );
      res.json({ items: page.items.map(toTrack) });
    } catch (err) {
      next(err);
    }
  });

  router.get('/recently-played', requireAuth, async (req, res, next) => {
    try {
      const limit = intParam(req.query.limit, { name: 'limit', min: 1, max: 50, fallback: 20 });
      const page = await createSpotifyClient(req, config).request<
        SpotifyPaging<{ track: SpotifyTrack; played_at: string; context: { uri: string } | null }>
      >(`/me/player/recently-played?limit=${limit}`);
      const items: Array<{ track: TrackDto; playedAt: string; contextUri: string | null }> =
        page.items.map((i) => ({
          track: toTrack(i.track),
          playedAt: i.played_at,
          contextUri: i.context?.uri ?? null,
        }));
      res.set('Cache-Control', 'no-store');
      res.json({ items });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
