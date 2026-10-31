import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../app.js';
import { loadConfig } from '../config.js';
import { testConfig } from '../test/helpers.js';

function directives(header: string) {
  return Object.fromEntries(
    header.split(';').map((d) => {
      const [name, ...values] = d.trim().split(/\s+/);
      return [name, values];
    }),
  );
}

describe('security headers', () => {
  it('sends a strict CSP that allows only the Spotify origins the app needs', async () => {
    const res = await request(createApp(testConfig)).get('/api/health');
    const csp = directives(res.headers['content-security-policy']);
    expect(csp['default-src']).toEqual(["'self'"]);
    expect(csp['script-src']).toEqual(["'self'", 'https://sdk.scdn.co']);
    expect(csp['frame-src']).toEqual(['https://sdk.scdn.co']);
    expect(csp['connect-src']).toEqual(["'self'", 'https://api.spotify.com']);
    expect(csp['img-src']).toContain('https://i.scdn.co');
    expect(csp['style-src']).toEqual(["'self'"]);
    expect(csp['object-src']).toEqual(["'none'"]);
    expect(csp['frame-ancestors']).toEqual(["'none'"]);
    expect(res.headers['content-security-policy']).not.toContain('unsafe-inline');
    expect(res.headers['content-security-policy']).not.toContain('unsafe-eval');
    expect(csp['upgrade-insecure-requests']).toBeUndefined();
  });

  it('upgrades insecure requests in production', async () => {
    const prod = loadConfig({
      NODE_ENV: 'production',
      APP_ORIGIN: 'https://music.example.com',
      SPOTIFY_CLIENT_ID: 'x',
      SPOTIFY_CLIENT_SECRET: 'y',
      SPOTIFY_REDIRECT_URI: 'https://music.example.com/api/auth/callback',
      SESSION_SECRET: 'z',
      REDIS_URL: 'redis://localhost:6379',
    });
    const { MemoryStore } = await import('express-session');
    const res = await request(createApp(prod, { sessionStore: new MemoryStore() })).get(
      '/api/health',
    );
    expect(res.headers['content-security-policy']).toContain('upgrade-insecure-requests');
    expect(res.headers['strict-transport-security']).toBeDefined();
  });

  it('keeps the other helmet protections', async () => {
    const res = await request(createApp(testConfig)).get('/api/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(res.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
  });
});
