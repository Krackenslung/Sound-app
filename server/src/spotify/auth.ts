import { createHash, randomBytes } from 'node:crypto';
import type { SpotifyConfig } from '../config.js';
import type { SpotifyTokenResponse, TokenSet } from './types.js';

export const ACCOUNTS_BASE = 'https://accounts.spotify.com';

export const SCOPES = [
  'streaming',
  'user-read-email',
  'user-read-private',
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-currently-playing',
  'user-read-recently-played',
  'user-top-read',
  'user-library-read',
  'user-library-modify',
  'playlist-read-private',
  'playlist-read-collaborative',
  'playlist-modify-public',
  'playlist-modify-private',
];

export class SpotifyAuthError extends Error {
  constructor(
    public status: number,
    public error: string,
    message?: string,
  ) {
    super(message ?? error);
    this.name = 'SpotifyAuthError';
  }
  get isInvalidGrant() {
    return this.error === 'invalid_grant';
  }
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

export function createPkcePair() {
  const verifier = randomToken(64); // 86 chars, within the 43–128 range
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  return { verifier, challenge };
}

export function buildAuthorizeUrl(
  cfg: SpotifyConfig,
  { state, codeChallenge }: { state: string; codeChallenge: string },
): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: cfg.clientId,
    scope: SCOPES.join(' '),
    redirect_uri: cfg.redirectUri,
    state,
    code_challenge_method: 'S256',
    code_challenge: codeChallenge,
  });
  return `${ACCOUNTS_BASE}/authorize?${params}`;
}

async function tokenRequest(
  cfg: SpotifyConfig,
  body: URLSearchParams,
): Promise<SpotifyTokenResponse> {
  // Confidential client: authenticate with the client secret (server-side only) in addition to PKCE.
  const basic = Buffer.from(`${cfg.clientId}:${cfg.clientSecret}`).toString('base64');
  const res = await fetch(`${ACCOUNTS_BASE}/api/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new SpotifyAuthError(
      res.status,
      String(json.error ?? 'token_error'),
      String(json.error_description ?? `Token request failed (${res.status})`),
    );
  }
  return json as unknown as SpotifyTokenResponse;
}

function toTokenSet(
  r: SpotifyTokenResponse,
  previousRefreshToken?: string,
  now = Date.now(),
): TokenSet {
  const refreshToken = r.refresh_token ?? previousRefreshToken;
  if (!refreshToken) throw new SpotifyAuthError(500, 'missing_refresh_token');
  return {
    accessToken: r.access_token,
    // Spotify may rotate refresh tokens; keep the old one only if no new one is returned.
    refreshToken,
    expiresAt: now + r.expires_in * 1000,
    scope: r.scope,
  };
}

export async function exchangeCode(
  cfg: SpotifyConfig,
  code: string,
  codeVerifier: string,
): Promise<TokenSet> {
  const r = await tokenRequest(
    cfg,
    new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: cfg.redirectUri,
      code_verifier: codeVerifier,
    }),
  );
  return toTokenSet(r);
}

export async function refreshTokens(cfg: SpotifyConfig, refreshToken: string): Promise<TokenSet> {
  const r = await tokenRequest(
    cfg,
    new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken }),
  );
  return toTokenSet(r, refreshToken);
}
