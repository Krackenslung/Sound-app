import type { Store } from 'express-session';
import { RedisStore } from 'connect-redis';
import { createClient } from 'redis';
import { createApp } from './app.js';
import { loadConfig } from './config.js';

const config = loadConfig();

async function createStore(): Promise<Store | undefined> {
  if (!config.redisUrl) {
    if (config.isProd) throw new Error('REDIS_URL is required in production');
    console.warn('[server] REDIS_URL not set — using in-memory sessions (development only)');
    return undefined;
  }
  const client = createClient({ url: config.redisUrl });
  client.on('error', (err) => console.error('[redis]', err.message));
  await client.connect();
  return new RedisStore({ client, prefix: 'pulse:sess:' });
}

if (!config.spotify.clientId || !config.spotify.clientSecret) {
  console.warn('[server] SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET not set — login will fail');
}

const sessionStore = await createStore();
const app = createApp(config, { sessionStore });

app.listen(config.port, '0.0.0.0', () => {
  console.log(`[server] listening on :${config.port} (${config.nodeEnv})`);
});
