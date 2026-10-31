import request from 'supertest';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../app.js';
import { loadConfig } from '../config.js';
import { parseCallback, upsertEnv } from '../cli/ownerToken.js';
import { createMockState, createSpotifyMock, type MockState } from '../test/spotifyMock.js';
import { login } from '../test/helpers.js';

const baseEnv = {
  NODE_ENV: 'test',
  SPOTIFY_CLIENT_ID: 'client-id',
  SPOTIFY_CLIENT_SECRET: 'client-secret',
  SESSION_SECRET: 'test-secret',
};
const ownerConfig = loadConfig({ ...baseEnv, SPOTIFY_REFRESH_TOKEN: 'owner-refresh' });

const state: MockState = createMockState();
const mock = createSpotifyMock(state);
beforeAll(() => mock.listen({ onUnhandledRequest: 'bypass' }));
afterAll(() => mock.close());
beforeEach(() => Object.assign(state, createMockState()));
afterEach(() => mock.resetHandlers());

describe('owner mode', () => {
  it('serves the owner account with no login, and the browser never sees the refresh token', async () => {
    const app = createApp(ownerConfig);
    const me = await request(app).get('/api/me');
    expect(me.status).toBe(200);
    expect(me.body.ownerMode).toBe(true);
    expect(state.tokenCalls[0]!.get('refresh_token')).toBe('owner-refresh');

    const token = await request(app).get('/api/auth/token');
    expect(token.status).toBe(200);
    expect(token.body.accessToken).toBe('access-1');
    expect(token.body.expiresAt).toBeGreaterThan(Date.now());
    expect(JSON.stringify([me.body, token.body])).not.toContain('owner-refresh');
  });

  it('refreshes once for all requests, and keeps a rotated refresh token', async () => {
    state.rotateRefreshToken = true;
    const app = createApp(ownerConfig);
    await Promise.all([request(app).get('/api/me'), request(app).get('/api/auth/token')]);
    expect(state.refreshCounter).toBe(1);
  });

  it('reports OWNER_TOKEN_EXPIRED once Spotify rejects the saved login', async () => {
    state.refreshError = { status: 400, error: 'invalid_grant' };
    const app = createApp(ownerConfig);
    const first = await request(app).get('/api/me');
    expect(first.status).toBe(401);
    expect(first.body.code).toBe('OWNER_TOKEN_EXPIRED');
    const calls = state.tokenCalls.length;
    const again = await request(app).get('/api/player/devices');
    expect(again.body.code).toBe('OWNER_TOKEN_EXPIRED');
    expect(state.tokenCalls.length).toBe(calls); // no more refresh attempts
  });

  it('a real login still takes precedence over the owner account', async () => {
    const { agent } = await login(request.agent(createApp(ownerConfig)));
    const me = await agent.get('/api/me');
    expect(me.status).toBe(200);
    expect(me.body.ownerMode).toBe(false);
  });

  it('is off in production unless OWNER_MODE=on', () => {
    const prod = {
      ...baseEnv,
      NODE_ENV: 'production',
      SPOTIFY_REDIRECT_URI: 'https://x.test/api/auth/callback',
      REDIS_URL: 'redis://x',
      APP_ORIGIN: 'https://x.test',
      SPOTIFY_REFRESH_TOKEN: 'owner-refresh',
    };
    expect(loadConfig(prod).ownerRefreshToken).toBeUndefined();
    expect(loadConfig({ ...prod, OWNER_MODE: 'on' }).ownerRefreshToken).toBe('owner-refresh');
  });

  it('is off without SPOTIFY_REFRESH_TOKEN', async () => {
    const res = await request(createApp(loadConfig(baseEnv))).get('/api/me');
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHENTICATED');
  });
});

describe('owner-token CLI helpers', () => {
  it('reads the code from a pasted callback address and checks state', () => {
    expect(parseCallback('http://127.0.0.1:8888/callback?code=abc&state=s1', 's1')).toBe('abc');
    expect(parseCallback('  abc  ', 's1')).toBe('abc');
    expect(() => parseCallback('http://127.0.0.1:8888/callback?code=abc&state=zz', 's1')).toThrow(
      /different login attempt/,
    );
    expect(() => parseCallback('http://127.0.0.1:8888/callback?error=access_denied', 's1')).toThrow(
      /access_denied/,
    );
  });

  it('adds or replaces the key in .env without touching other lines', () => {
    expect(upsertEnv('', 'K', 'v')).toBe('K=v\n');
    expect(upsertEnv('A=1', 'K', 'v')).toBe('A=1\nK=v\n');
    expect(upsertEnv('A=1\nK=old\nB=2\n', 'K', 'new')).toBe('A=1\nK=new\nB=2\n');
  });
});
