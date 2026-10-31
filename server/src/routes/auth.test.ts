import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { loadConfig } from '../config.js';
import { login, newAgent, testConfig } from '../test/helpers.js';
import { createMockState, createSpotifyMock, type MockState } from '../test/spotifyMock.js';

const config = testConfig;

const state: MockState = createMockState();
const mock = createSpotifyMock(state);

beforeAll(() => mock.listen({ onUnhandledRequest: 'bypass' }));
afterAll(() => mock.close());
beforeEach(() => {
  Object.assign(state, createMockState());
});
afterEach(() => mock.resetHandlers());

describe('GET /api/auth/login', () => {
  it('redirects to Spotify authorize with scopes, state and a PKCE challenge', async () => {
    const res = await newAgent().get('/api/auth/login');
    expect(res.status).toBe(302);
    const url = new URL(res.headers.location);
    expect(url.origin + url.pathname).toBe('https://accounts.spotify.com/authorize');
    expect(url.searchParams.get('client_id')).toBe('client-id');
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('redirect_uri')).toBe(config.spotify.redirectUri);
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.get('code_challenge')).toMatch(/^[\w-]{43}$/);
    expect(url.searchParams.get('state')).toBeTruthy();
    expect(url.searchParams.get('scope')!.split(' ')).toEqual(
      expect.arrayContaining([
        'streaming',
        'user-read-private',
        'user-top-read',
        'playlist-modify-private',
      ]),
    );
  });

  it('sends you back to /login?error=not_configured when Spotify credentials are missing', async () => {
    const app = createApp(loadConfig({ NODE_ENV: 'test' }));
    const res = await request(app).get('/api/auth/login');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('http://127.0.0.1:5173/login?error=not_configured');
  });

  it('sets an httpOnly, SameSite=Lax session cookie', async () => {
    const res = await newAgent().get('/api/auth/login');
    const cookie = ([] as string[]).concat(res.headers['set-cookie'] ?? [])[0];
    expect(cookie).toMatch(/^pulse\.sid=/);
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/SameSite=Lax/);
    expect(cookie).not.toMatch(/Secure/); // secure only in production
  });
});

describe('GET /api/auth/callback', () => {
  it('exchanges the code (with PKCE verifier + client auth) and redirects home', async () => {
    const { callback } = await login();
    expect(callback.status).toBe(302);
    expect(callback.headers.location).toBe('http://127.0.0.1:5173/');

    const exchange = state.tokenCalls[0];
    expect(exchange.get('grant_type')).toBe('authorization_code');
    expect(exchange.get('code_verifier')).toMatch(/^[\w-]{43,128}$/);
    expect(exchange.get('redirect_uri')).toBe(config.spotify.redirectUri);
    expect(state.tokenAuthHeaders[0]).toBe(
      `Basic ${Buffer.from('client-id:client-secret').toString('base64')}`,
    );
  });

  it('rotates the session id on login (no session fixation)', async () => {
    const agent = newAgent();
    const pre = await agent.get('/api/auth/login');
    const preCookie = ([] as string[]).concat(pre.headers['set-cookie'])[0].split(';')[0];
    const s = new URL(pre.headers.location).searchParams.get('state');
    const cb = await agent.get(`/api/auth/callback?code=good-code&state=${s}`);
    const postCookie = ([] as string[]).concat(cb.headers['set-cookie'])[0].split(';')[0];
    expect(postCookie).not.toBe(preCookie);
  });

  it('rejects a mismatched state', async () => {
    const agent = newAgent();
    await agent.get('/api/auth/login');
    const res = await agent.get('/api/auth/callback?code=good-code&state=forged');
    expect(res.headers.location).toBe('http://127.0.0.1:5173/login?error=state_mismatch');
    expect(state.tokenCalls).toHaveLength(0);
    expect((await agent.get('/api/me')).status).toBe(401);
  });

  it('rejects a callback without a prior login (no stored state)', async () => {
    const res = await newAgent().get('/api/auth/callback?code=good-code&state=anything');
    expect(res.headers.location).toBe('http://127.0.0.1:5173/login?error=state_mismatch');
  });

  it('forwards Spotify errors such as access_denied to the login page', async () => {
    const agent = newAgent();
    const login = await agent.get('/api/auth/login');
    const s = new URL(login.headers.location).searchParams.get('state');
    const res = await agent.get(`/api/auth/callback?error=access_denied&state=${s}`);
    expect(res.headers.location).toBe('http://127.0.0.1:5173/login?error=access_denied');
  });

  it('redirects with token_exchange_failed when the code is rejected', async () => {
    const agent = newAgent();
    const login = await agent.get('/api/auth/login');
    const s = new URL(login.headers.location).searchParams.get('state');
    const res = await agent.get(`/api/auth/callback?code=bad-code&state=${s}`);
    expect(res.headers.location).toBe('http://127.0.0.1:5173/login?error=token_exchange_failed');
  });
});

describe('session lifecycle', () => {
  it('stays logged in across requests and logs out', async () => {
    const { agent } = await login();

    const me = await agent.get('/api/me');
    expect(me.status).toBe(200);
    expect(me.body).toEqual({
      id: 'jg',
      displayName: 'Jesus G.',
      email: 'jg@example.com',
      product: 'premium',
      country: 'MX',
      avatarUrl: 'https://i.scdn.co/image/small',
      ownerMode: false,
    });
    expect(state.apiAuthHeaders.at(-1)).toBe('Bearer access-0');
    expect((await agent.get('/api/me')).status).toBe(200);

    const logout = await agent.post('/api/auth/logout');
    expect(logout.status).toBe(204);
    const after = await agent.get('/api/me');
    expect(after.status).toBe(401);
    expect(after.body.code).toBe('UNAUTHENTICATED');
  });

  it('never returns the refresh token to the client', async () => {
    const { agent } = await login();
    const res = await agent.get('/api/auth/token');
    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(Object.keys(res.body).sort()).toEqual(['accessToken', 'expiresAt']);
    expect(JSON.stringify(res.body)).not.toContain('refresh');
  });

  it('requires auth for /api/auth/token and /api/me', async () => {
    expect((await newAgent().get('/api/auth/token')).status).toBe(401);
    expect((await newAgent().get('/api/me')).status).toBe(401);
  });
});

describe('token refresh', () => {
  it('refreshes transparently when the access token expires within 60 s', async () => {
    state.expiresIn = 30; // already inside the refresh window
    const { agent } = await login();

    const res = await agent.get('/api/auth/token');
    expect(res.body.accessToken).toBe('access-1');
    expect(state.tokenCalls.at(-1)!.get('grant_type')).toBe('refresh_token');
    expect(state.tokenCalls.at(-1)!.get('refresh_token')).toBe('refresh-0');

    // New token is persisted: no further refresh needed.
    const again = await agent.get('/api/auth/token');
    expect(again.body.accessToken).toBe('access-1');
    expect(state.refreshCounter).toBe(1);
  });

  it('does not refresh a token with plenty of time left', async () => {
    const { agent } = await login();
    const res = await agent.get('/api/auth/token');
    expect(res.body.accessToken).toBe('access-0');
    expect(state.refreshCounter).toBe(0);
  });

  it('stores a rotated refresh token', async () => {
    state.expiresIn = 30;
    state.rotateRefreshToken = true;
    const { agent } = await login();
    await agent.get('/api/auth/token'); // refresh #1 -> refresh-1
    state.meFailures.push({ status: 401 }); // force refresh #2
    await agent.get('/api/me');
    expect(state.tokenCalls.at(-1)!.get('refresh_token')).toBe('refresh-1');
  });

  it('only refreshes once for concurrent requests', async () => {
    state.expiresIn = 30;
    const { agent } = await login();
    await Promise.all([
      agent.get('/api/auth/token'),
      agent.get('/api/auth/token'),
      agent.get('/api/me'),
    ]);
    // Requests on one agent may be serialized, but either way only a single refresh must happen.
    expect(state.refreshCounter).toBe(1);
  });

  it('on invalid_grant destroys the session and returns 401', async () => {
    state.expiresIn = 30;
    state.refreshError = { status: 400, error: 'invalid_grant' };
    const { agent } = await login();

    const res = await agent.get('/api/auth/token');
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('SESSION_EXPIRED');

    state.refreshError = undefined;
    const after = await agent.get('/api/me');
    expect(after.status).toBe(401);
    expect(after.body.code).toBe('UNAUTHENTICATED');
  });

  it('on a Spotify 401 refreshes once and retries once', async () => {
    const { agent } = await login();
    state.meFailures.push({ status: 401 });
    const res = await agent.get('/api/me');
    expect(res.status).toBe(200);
    expect(state.refreshCounter).toBe(1);
    expect(state.apiAuthHeaders.slice(-2)).toEqual(['Bearer access-0', 'Bearer access-1']);
  });

  it('gives up after a second 401', async () => {
    const { agent } = await login();
    state.meFailures.push({ status: 401 }, { status: 401 });
    const res = await agent.get('/api/me');
    expect(res.status).toBe(401);
    expect(state.refreshCounter).toBe(1);
  });
});

describe('Spotify error mapping on /api/me', () => {
  it('maps 403 to { code: "FORBIDDEN" } with the Spotify message', async () => {
    const { agent } = await login();
    state.meFailures.push({
      status: 403,
      body: { error: { status: 403, message: 'User not registered in the Developer Dashboard' } },
    });
    const res = await agent.get('/api/me');
    expect(res.status).toBe(403);
    expect(res.body).toEqual({
      code: 'FORBIDDEN',
      message: 'User not registered in the Developer Dashboard',
    });
  });

  it('retries 5xx with backoff, then succeeds', async () => {
    const { agent } = await login();
    state.meFailures.push({ status: 502 }, { status: 503 });
    const res = await agent.get('/api/me');
    expect(res.status).toBe(200);
  });

  it('returns QUOTA_EXCEEDED without retrying', async () => {
    const { agent } = await login();
    state.meFailures.push({
      status: 429,
      body: { error: { status: 429, message: 'Quota exceeded', reason: 'QUOTA_EXCEEDED' } },
      headers: { 'Retry-After': '1' },
    });
    const res = await agent.get('/api/me');
    expect(res.status).toBe(429);
    expect(res.body.code).toBe('QUOTA_EXCEEDED');
    expect(state.meFailures).toHaveLength(0);
  });
});

describe('GET /api/me without Spotify credentials', () => {
  it('returns 401 LOGIN_NOT_CONFIGURED so the client can open demo mode', async () => {
    const app = createApp(loadConfig({ NODE_ENV: 'test' }));
    const res = await request(app).get('/api/me');
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('LOGIN_NOT_CONFIGURED');
  });

  it('still returns plain 401 UNAUTHENTICATED when credentials are set', async () => {
    const res = await newAgent().get('/api/me');
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHENTICATED');
  });
});
