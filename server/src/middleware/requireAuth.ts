import type { RequestHandler } from 'express';
import { HttpError } from './errorHandler.js';

export const requireAuth: RequestHandler = (req, _res, next) => {
  if (req.session.tokens || req.owner) return next();
  if (req.ownerExpired) {
    return next(
      new HttpError(
        401,
        'OWNER_TOKEN_EXPIRED',
        'The saved Spotify login (SPOTIFY_REFRESH_TOKEN) expired. Run `npm run owner-token` again.',
      ),
    );
  }
  next(new HttpError(401, 'UNAUTHENTICATED', 'Not logged in'));
};
