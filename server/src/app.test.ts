import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from './app.js';
import { loadConfig } from './config.js';

const app = createApp(loadConfig({ NODE_ENV: 'test', APP_ORIGIN: 'http://127.0.0.1:5173' }));

describe('app', () => {
  it('GET /api/health returns { ok: true }', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it('unknown /api routes return a JSON 404', async () => {
    const res = await request(app).get('/api/nope');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ code: 'NOT_FOUND', message: 'Route not found' });
  });

  it('sets security headers via helmet', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('allows CORS only for APP_ORIGIN', async () => {
    const ok = await request(app).get('/api/health').set('Origin', 'http://127.0.0.1:5173');
    expect(ok.headers['access-control-allow-origin']).toBe('http://127.0.0.1:5173');
    const bad = await request(app).get('/api/health').set('Origin', 'https://evil.example');
    expect(bad.headers['access-control-allow-origin']).not.toBe('https://evil.example');
  });
});
