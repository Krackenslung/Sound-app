import type { Request } from 'express';
import type { AppConfig } from '../config.js';
import { createSpotifyClient } from './spotifyClient.js';
import type { SpotifyUser } from './types.js';

/** The current user's Spotify id, cached in the session after the first lookup. */
export async function getUserId(req: Request, config: AppConfig): Promise<string> {
  if (req.session.userId) return req.session.userId;
  const me = await createSpotifyClient(req, config).request<SpotifyUser>('/me');
  req.session.userId = me.id;
  return me.id;
}
