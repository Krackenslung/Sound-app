import { Writable } from 'node:stream';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from './app.js';
import { createLogger, sanitizeUrl } from './logger.js';
import { testConfig } from './test/helpers.js';
import { createMockState, createSpotifyMock } from './test/spotifyMock.js';

const state = createMockState();
const mock = createSpotifyMock(state);
beforeAll(() => mock.listen({ onUnhandledRequest: 'bypass' }));
afterAll(() => mock.close());
beforeEach(() => Object.assign(state, createMockState()));
afterEach(() => mock.resetHandlers());

function capture() {
  const lines: string[] = [];
  const stream = new Writable({
    write(chunk, _enc, cb) {
      lines.push(String(chunk));
      cb();
    },
  });
  return { lines, logger: createLogger(testConfig, stream) };
}

describe('sanitizeUrl', () => {
  it('redacts OAuth and token query params, keeps the rest', () => {
    expect(sanitizeUrl('/api/auth/callback?code=abc123&state=xyz&error=access_denied')).toBe(
      '/api/auth/callback?code=[redacted]&state=[redacted]&error=access_denied',
    );
    expect(sanitizeUrl('/api/search?q=neon&type=track')).toBe('/api/search?q=neon&type=track');
    expect(sanitizeUrl('/api/me')).toBe('/api/me');
  });
});

describe('logging', () => {
  it('logs requests as JSON without tokens, cookies, OAuth codes or the client secret', async () => {
    const { lines, logger } = capture();
    state.expiresIn = 30; // forces a refresh on the next token use
    state.rotateRefreshToken = true;
    const agent = request.agent(createApp(testConfig, { logger }));

    const login = await agent.get('/api/auth/login');
    const oauthState = new URL(login.headers.location).searchParams.get('state')!;
    const cb = await agent.get(`/api/auth/callback?code=good-code&state=${oauthState}`);
    const cookie = ([] as string[]).concat(cb.headers['set-cookie'])[0].split(';')[0].split('=')[1];
    await agent.get('/api/auth/token');
    await agent.get('/api/me');
    await agent.post('/api/auth/logout');

    const log = lines.join('');
    const entries = lines.map((l) => JSON.parse(l));
    // Structured JSON with request metadata…
    expect(entries.some((e) => e.req?.url === '/api/me' && e.res?.statusCode === 200)).toBe(true);
    expect(entries.some((e) => e.msg === 'access token refreshed')).toBe(true);
    expect(entries.find((e) => e.req?.url?.startsWith('/api/auth/callback'))?.req.url).toBe(
      '/api/auth/callback?code=[redacted]&state=[redacted]',
    );
    // …and none of the secrets.
    for (const secret of [
      'good-code',
      oauthState,
      cookie,
      decodeURIComponent(cookie),
      'access-0',
      'access-1',
      'refresh-0',
      'refresh-1',
      'client-secret',
      'test-secret',
      'Bearer',
    ]) {
      expect(log, `log leaked ${secret}`).not.toContain(secret);
    }
    expect(log).not.toMatch(/authorization|cookie/i);
  });

  it('redacts token fields even if a log call includes them', () => {
    const { lines, logger } = capture();
    logger.info(
      {
        tokens: { accessToken: 'a1', refreshToken: 'r1' },
        access_token: 'a2',
        nested: { refreshToken: 'r2' },
      },
      'oops',
    );
    const log = lines.join('');
    for (const s of ['a1', 'r1', 'a2', 'r2']) expect(log).not.toContain(`"${s}"`);
    expect(log).toContain('[redacted]');
  });
});
