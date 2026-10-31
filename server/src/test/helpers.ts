import request from 'supertest';
import { createApp } from '../app.js';
import { loadConfig } from '../config.js';

export const testConfig = loadConfig({
  NODE_ENV: 'test',
  APP_ORIGIN: 'http://127.0.0.1:5173',
  SPOTIFY_CLIENT_ID: 'client-id',
  SPOTIFY_CLIENT_SECRET: 'client-secret',
  SPOTIFY_REDIRECT_URI: 'http://127.0.0.1:5173/api/auth/callback',
  SESSION_SECRET: 'test-secret',
});

export function newAgent() {
  return request.agent(createApp(testConfig));
}

/** Runs the OAuth dance against the MSW mock (which accepts code `good-code`). */
export async function login(agent = newAgent()) {
  const res = await agent.get('/api/auth/login');
  const authorize = new URL(res.headers.location);
  const state = authorize.searchParams.get('state')!;
  const callback = await agent.get(`/api/auth/callback?code=good-code&state=${state}`);
  return { agent, authorize, callback };
}
