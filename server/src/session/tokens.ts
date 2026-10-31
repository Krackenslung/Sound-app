import type { Request } from 'express';
import type { AppConfig } from '../config.js';
import { HttpError } from '../middleware/errorHandler.js';
import { refreshTokens, SpotifyAuthError } from '../spotify/auth.js';

export const MIN_TOKEN_TTL_MS = 60_000;

// One in-flight refresh per session, so parallel requests don't burn the refresh token twice.
const inflight = new Map<string, Promise<string>>();

function saveSession(req: Request) {
  return new Promise<void>((resolve, reject) =>
    req.session.save((e) => (e ? reject(e) : resolve())),
  );
}

export function destroySession(req: Request) {
  return new Promise<void>((resolve) => req.session.destroy(() => resolve()));
}

/**
 * Returns a valid access token for the current session, refreshing it when it expires
 * within `MIN_TOKEN_TTL_MS` (or when `force` is set, e.g. after a 401 from Spotify).
 * On `invalid_grant` the session is destroyed and a 401 is thrown.
 */
export async function getValidAccessToken(
  req: Request,
  config: AppConfig,
  { force = false }: { force?: boolean } = {},
): Promise<string> {
  const tokens = req.session.tokens;
  if (!tokens && req.owner) return req.owner.accessToken({ force });
  if (!tokens) throw new HttpError(401, 'UNAUTHENTICATED', 'Not logged in');

  if (!force && tokens.expiresAt - Date.now() > MIN_TOKEN_TTL_MS) return tokens.accessToken;

  const key = req.sessionID;
  let pending = inflight.get(key);
  if (!pending) {
    pending = (async () => {
      try {
        const next = await refreshTokens(config.spotify, tokens.refreshToken);
        req.session.tokens = next;
        await saveSession(req);
        req.log?.info(
          { rotated: next.refreshToken !== tokens.refreshToken },
          'access token refreshed',
        );
        return next.accessToken;
      } finally {
        inflight.delete(key);
      }
    })();
    inflight.set(key, pending);
  }

  try {
    return await pending;
  } catch (err) {
    if (err instanceof SpotifyAuthError && err.isInvalidGrant) {
      req.log?.warn('refresh token rejected (invalid_grant); session destroyed');
      await destroySession(req);
      throw new HttpError(
        401,
        'SESSION_EXPIRED',
        'Your Spotify session expired. Please log in again.',
      );
    }
    throw err;
  }
}
