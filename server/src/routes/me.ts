import { Router } from 'express';
import type { AppConfig } from '../config.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { createSpotifyClient } from '../spotify/spotifyClient.js';
import type { SpotifyUser } from '../spotify/types.js';

export interface MeResponse {
  id: string;
  displayName: string;
  email: string | null;
  product: string;
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
    product: u.product ?? 'free',
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
  return router;
}
