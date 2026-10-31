import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../app.js';
import { testConfig } from '../test/helpers.js';

const app = (api = 3, auth = 2) =>
  createApp(testConfig, { rateLimits: { windowMs: 60_000, api, auth } });

describe('rate limiting', () => {
  it('limits /api/* per IP with a JSON 429 and Retry-After', async () => {
    const agent = request.agent(app(3));
    for (let i = 0; i < 3; i++) expect((await agent.get('/api/me')).status).toBe(401);
    const res = await agent.get('/api/me');
    expect(res.status).toBe(429);
    expect(res.body).toMatchObject({ code: 'RATE_LIMITED', retryAfter: expect.any(Number) });
    expect(Number(res.headers['retry-after'])).toBeGreaterThan(0);
    expect(res.headers['ratelimit-policy'] ?? res.headers['ratelimit']).toBeDefined();
  });

  it('never limits the health check', async () => {
    const agent = request.agent(app(1));
    for (let i = 0; i < 5; i++) expect((await agent.get('/api/health')).status).toBe(200);
  });

  it('applies a stricter limit to login', async () => {
    const agent = request.agent(app(100, 2));
    expect((await agent.get('/api/auth/login')).status).toBe(302);
    expect((await agent.get('/api/auth/login')).status).toBe(302);
    const res = await agent.get('/api/auth/login');
    expect(res.status).toBe(429);
    expect(res.body.message).toMatch(/login attempts/);
    // Other endpoints still have budget.
    expect((await agent.get('/api/me')).status).toBe(401);
  });
});

describe('request size limits', () => {
  it('rejects bodies over 16 KB with a JSON 413', async () => {
    const res = await request(app(100))
      .post('/api/playlists')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ name: 'x'.repeat(20_000) }));
    expect(res.status).toBe(413);
    expect(res.body).toEqual({ code: 'PAYLOAD_TOO_LARGE', message: 'Request body is too large' });
  });

  it('rejects malformed JSON with a JSON 400', async () => {
    const res = await request(app(100))
      .put('/api/player/play')
      .set('Content-Type', 'application/json')
      .send('{nope');
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_JSON');
  });
});
