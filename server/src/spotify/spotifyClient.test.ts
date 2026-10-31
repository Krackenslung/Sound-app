import { createHash } from 'node:crypto';
import type { Request } from 'express';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { HttpError } from '../middleware/errorHandler.js';
import { getValidAccessToken } from '../session/tokens.js';
import { testConfig } from '../test/helpers.js';
import type { TokenSet } from './types.js';
import {
  ACCOUNTS_BASE,
  buildAuthorizeUrl,
  createPkcePair,
  refreshTokens,
  SpotifyAuthError,
} from './auth.js';
import { API_BASE, createSpotifyClient } from './spotifyClient.js';

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

let refreshCalls = 0;
let nextRefresh: () => Response = () =>
  HttpResponse.json({
    access_token: `new-${++refreshCalls}`,
    token_type: 'Bearer',
    scope: 's',
    expires_in: 3600,
  });

function tokenEndpoint() {
  return http.post(`${ACCOUNTS_BASE}/api/token`, () => nextRefresh());
}

/** Fake Express request with an in-memory session. */
function fakeReq(tokens: Partial<TokenSet> = {}) {
  const session = {
    tokens: {
      accessToken: 'old',
      refreshToken: 'r0',
      expiresAt: Date.now() + 3600_000,
      scope: 's',
      ...tokens,
    } as TokenSet | undefined,
    save: vi.fn((cb: (e?: unknown) => void) => cb()),
    destroy: vi.fn(function (this: { tokens?: TokenSet }, cb: () => void) {
      session.tokens = undefined;
      cb();
    }),
  };
  return { req: { session, sessionID: `sid-${Math.random()}` } as unknown as Request, session };
}

/** Responds to GET {API_BASE}/x with the queued responses in order; records Authorization headers. */
function queue(path: string, ...responses: Array<() => Response>) {
  const auth: string[] = [];
  server.use(
    tokenEndpoint(),
    http.all(`${API_BASE}${path}`, ({ request }) => {
      auth.push(request.headers.get('authorization') ?? '');
      const next = responses.shift();
      if (!next) throw new Error('no more queued responses');
      return next();
    }),
  );
  return auth;
}

const json =
  (body: Record<string, unknown>, status = 200, headers?: Record<string, string>) =>
  () =>
    HttpResponse.json(body, { status, headers });

function client(req: Request, sleep = vi.fn(async (_ms: number) => {})) {
  return { api: createSpotifyClient(req, testConfig, { sleep }), sleep };
}

describe('spotifyClient responses', () => {
  it('returns parsed JSON, undefined for 204, and tolerates non-JSON 2xx bodies', async () => {
    const { req } = fakeReq();
    queue(
      '/x',
      json({ ok: 1 }),
      () => new HttpResponse(null, { status: 204 }),
      () => new HttpResponse('OK', { status: 200 }),
    );
    const { api } = client(req);
    expect(await api.request('/x')).toEqual({ ok: 1 });
    expect(await api.request('/x')).toBeUndefined();
    expect(await api.request('/x')).toBeUndefined();
  });

  it('sends the access token and JSON content type for bodies', async () => {
    const { req } = fakeReq();
    let contentType: string | null = null;
    server.use(
      http.put(`${API_BASE}/y`, ({ request }) => {
        contentType = request.headers.get('content-type');
        return new HttpResponse(null, { status: 204 });
      }),
    );
    await client(req).api.request('/y', { method: 'PUT', body: '{}' });
    expect(contentType).toBe('application/json');
  });
});

describe('401 handling', () => {
  it('refreshes once and retries once', async () => {
    refreshCalls = 0;
    const { req, session } = fakeReq();
    const auth = queue('/x', json({}, 401), json({ ok: true }));
    expect(await client(req).api.request('/x')).toEqual({ ok: true });
    expect(auth).toEqual(['Bearer old', 'Bearer new-1']);
    expect(refreshCalls).toBe(1);
    expect(session.tokens?.accessToken).toBe('new-1');
    expect(session.save).toHaveBeenCalled();
  });

  it('gives up with 401 after the retry also fails', async () => {
    refreshCalls = 0;
    const { req } = fakeReq();
    queue('/x', json({}, 401), json({}, 401));
    await expect(client(req).api.request('/x')).rejects.toMatchObject({
      status: 401,
      code: 'UNAUTHENTICATED',
    });
    expect(refreshCalls).toBe(1);
  });
});

describe('5xx retry with backoff', () => {
  it('retries twice with exponential backoff, then succeeds', async () => {
    const { req } = fakeReq();
    queue('/x', json({}, 500), json({}, 503), json({ ok: true }));
    const { api, sleep } = client(req);
    expect(await api.request('/x')).toEqual({ ok: true });
    expect(sleep.mock.calls.map(([ms]) => ms)).toEqual([250, 500]);
  });

  it('surfaces 502 UPSTREAM_ERROR after max 2 retries', async () => {
    const { req } = fakeReq();
    queue('/x', json({}, 500), json({}, 500), json({}, 500), json({ never: true }));
    const { api, sleep } = client(req);
    await expect(api.request('/x')).rejects.toMatchObject({ status: 502, code: 'UPSTREAM_ERROR' });
    expect(sleep).toHaveBeenCalledTimes(2);
  });
});

describe('429 handling', () => {
  it('waits Retry-After seconds and retries once', async () => {
    const { req } = fakeReq();
    queue('/x', json({ error: { status: 429 } }, 429, { 'Retry-After': '2' }), json({ ok: true }));
    const { api, sleep } = client(req);
    expect(await api.request('/x')).toEqual({ ok: true });
    expect(sleep).toHaveBeenCalledWith(2000);
  });

  it('returns RATE_LIMITED with retryAfter when still limited', async () => {
    const { req } = fakeReq();
    const limited = json({ error: { status: 429 } }, 429, { 'Retry-After': '3' });
    queue('/x', limited, limited);
    await expect(client(req).api.request('/x')).rejects.toMatchObject({
      status: 429,
      code: 'RATE_LIMITED',
      details: { retryAfter: 3 },
    });
  });

  it("doesn't wait in-process for long Retry-After values", async () => {
    const { req } = fakeReq();
    queue('/x', json({ error: { status: 429 } }, 429, { 'Retry-After': '120' }));
    const { api, sleep } = client(req);
    await expect(api.request('/x')).rejects.toMatchObject({
      code: 'RATE_LIMITED',
      details: { retryAfter: 120 },
    });
    expect(sleep).not.toHaveBeenCalled();
  });

  it.each([
    [{ error: { status: 429, message: 'x', reason: 'QUOTA_EXCEEDED' } }],
    [{ error: { status: 429, message: 'API rate limit quota exceeded for this app' } }],
  ])('never retries quota exhaustion (%j)', async (body) => {
    const { req } = fakeReq();
    queue('/x', json(body, 429, { 'Retry-After': '1' }));
    const { api, sleep } = client(req);
    await expect(api.request('/x')).rejects.toMatchObject({ status: 429, code: 'QUOTA_EXCEEDED' });
    expect(sleep).not.toHaveBeenCalled();
  });
});

describe('other errors', () => {
  it('maps 403 to FORBIDDEN with the Spotify message', async () => {
    const { req } = fakeReq();
    queue('/x', json({ error: { status: 403, message: 'Premium required' } }, 403));
    await expect(client(req).api.request('/x')).rejects.toMatchObject({
      code: 'FORBIDDEN',
      message: 'Premium required',
    });
  });

  it('maps 404 on /me/player/* to NO_ACTIVE_DEVICE, elsewhere to SPOTIFY_ERROR', async () => {
    const { req } = fakeReq();
    queue('/me/player/play', json({ error: { status: 404, message: 'x' } }, 404));
    await expect(client(req).api.request('/me/player/play')).rejects.toMatchObject({
      code: 'NO_ACTIVE_DEVICE',
    });
    queue('/albums/zzz', json({ error: 'non existing id' }, 404));
    await expect(client(req).api.request('/albums/zzz')).rejects.toMatchObject({
      status: 404,
      code: 'SPOTIFY_ERROR',
      message: 'non existing id',
    });
  });
});

describe('getValidAccessToken', () => {
  it('refreshes proactively when < 60 s remain, keeping the old refresh token if none is returned', async () => {
    refreshCalls = 0;
    server.use(tokenEndpoint());
    const { req, session } = fakeReq({ expiresAt: Date.now() + 30_000 });
    expect(await getValidAccessToken(req, testConfig)).toBe('new-1');
    expect(session.tokens?.refreshToken).toBe('r0');
  });

  it('deduplicates concurrent refreshes for one session', async () => {
    refreshCalls = 0;
    server.use(tokenEndpoint());
    const { req } = fakeReq({ expiresAt: Date.now() - 1 });
    const tokens = await Promise.all([1, 2, 3].map(() => getValidAccessToken(req, testConfig)));
    expect(tokens).toEqual(['new-1', 'new-1', 'new-1']);
    expect(refreshCalls).toBe(1);
  });

  it('on invalid_grant destroys the session and throws SESSION_EXPIRED', async () => {
    nextRefresh = () =>
      HttpResponse.json(
        { error: 'invalid_grant', error_description: 'Refresh token revoked' },
        { status: 400 },
      );
    server.use(tokenEndpoint());
    const { req, session } = fakeReq({ expiresAt: 0 });
    const err = await getValidAccessToken(req, testConfig).catch((e) => e);
    expect(err).toBeInstanceOf(HttpError);
    expect(err).toMatchObject({ status: 401, code: 'SESSION_EXPIRED' });
    expect(session.destroy).toHaveBeenCalled();
    expect(session.tokens).toBeUndefined();
  });

  it('keeps the session on other refresh failures', async () => {
    nextRefresh = () => new HttpResponse('upstream down', { status: 503 });
    server.use(tokenEndpoint());
    const { req, session } = fakeReq({ expiresAt: 0 });
    const err = await getValidAccessToken(req, testConfig).catch((e) => e);
    expect(err).toBeInstanceOf(SpotifyAuthError);
    expect(err).toMatchObject({ status: 503, error: 'token_error' });
    expect(session.destroy).not.toHaveBeenCalled();
  });

  it('throws UNAUTHENTICATED without tokens', async () => {
    const { req, session } = fakeReq();
    session.tokens = undefined;
    await expect(getValidAccessToken(req, testConfig)).rejects.toMatchObject({
      code: 'UNAUTHENTICATED',
    });
  });
});

describe('auth helpers', () => {
  it('creates a valid PKCE pair (S256)', () => {
    const { verifier, challenge } = createPkcePair();
    expect(verifier).toMatch(/^[\w-]{43,128}$/);
    expect(challenge).toBe(createHash('sha256').update(verifier).digest('base64url'));
  });

  it('builds the authorize URL', () => {
    const url = new URL(
      buildAuthorizeUrl(testConfig.spotify, { state: 's1', codeChallenge: 'c1' }),
    );
    expect(Object.fromEntries(url.searchParams)).toMatchObject({
      response_type: 'code',
      client_id: 'client-id',
      state: 's1',
      code_challenge: 'c1',
      code_challenge_method: 'S256',
    });
  });

  it('refreshTokens stores a rotated refresh token', async () => {
    nextRefresh = () =>
      HttpResponse.json({
        access_token: 'a2',
        refresh_token: 'r2',
        scope: 's',
        expires_in: 60,
        token_type: 'Bearer',
      });
    server.use(tokenEndpoint());
    const t = await refreshTokens(testConfig.spotify, 'r1');
    expect(t).toMatchObject({ accessToken: 'a2', refreshToken: 'r2' });
    expect(t.expiresAt).toBeGreaterThan(Date.now());
  });
});
