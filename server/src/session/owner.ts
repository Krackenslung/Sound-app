import type { RequestHandler } from 'express';
import type { SpotifyConfig } from '../config.js';
import { HttpError } from '../middleware/errorHandler.js';
import { refreshTokens, SpotifyAuthError } from '../spotify/auth.js';
import type { TokenSet } from '../spotify/types.js';
import { MIN_TOKEN_TTL_MS } from './tokens.js';

/**
 * Owner mode: the server acts as one Spotify account (the app owner's) using a
 * refresh token from SPOTIFY_REFRESH_TOKEN, so nobody has to log in. The tokens
 * live only in server memory and are shared by every request; they never reach
 * the browser, which only gets short-lived access tokens via /api/auth/token.
 */
export class OwnerTokens {
  private tokens: TokenSet;
  private pending?: Promise<TokenSet>;
  /** Set once Spotify rejects the refresh token (revoked, or the 6-month limit). */
  expired = false;

  constructor(
    private readonly spotify: SpotifyConfig,
    refreshToken: string,
  ) {
    this.tokens = { accessToken: '', refreshToken, expiresAt: 0, scope: '' };
  }

  get expiresAt() {
    return this.tokens.expiresAt;
  }

  async accessToken({ force = false }: { force?: boolean } = {}): Promise<string> {
    if (this.expired) throw ownerExpired();
    if (!force && this.tokens.expiresAt - Date.now() > MIN_TOKEN_TTL_MS) {
      return this.tokens.accessToken;
    }
    // One refresh at a time, shared by all concurrent requests.
    this.pending ??= refreshTokens(this.spotify, this.tokens.refreshToken).finally(() => {
      this.pending = undefined;
    });
    try {
      this.tokens = await this.pending;
      return this.tokens.accessToken;
    } catch (err) {
      if (err instanceof SpotifyAuthError && err.isInvalidGrant) {
        this.expired = true;
        throw ownerExpired();
      }
      throw err;
    }
  }
}

function ownerExpired() {
  return new HttpError(
    401,
    'OWNER_TOKEN_EXPIRED',
    'The saved Spotify login (SPOTIFY_REFRESH_TOKEN) expired or was revoked. Run `npm run owner-token` again.',
  );
}

/** Attaches the owner account to requests that have no logged-in user of their own. */
export function ownerMode(owner: OwnerTokens | undefined): RequestHandler {
  return (req, _res, next) => {
    if (owner && !req.session.tokens) {
      if (owner.expired) req.ownerExpired = true;
      else req.owner = owner;
    }
    next();
  };
}
