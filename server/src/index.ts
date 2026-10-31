import type { Store } from 'express-session';
import { RedisStore } from 'connect-redis';
import { createClient } from 'redis';
import { createApp } from './app.js';
import { loadConfig } from './config.js';
import { createLogger } from './logger.js';

const config = loadConfig();
const logger = createLogger(config);

async function createStore(): Promise<Store | undefined> {
  if (!config.redisUrl) {
    if (config.isProd) throw new Error('REDIS_URL is required in production');
    logger.warn('REDIS_URL not set — using in-memory sessions (development only)');
    return undefined;
  }
  const client = createClient({ url: config.redisUrl });
  client.on('error', (err) => logger.error({ err: { message: err.message } }, 'redis error'));
  await client.connect();
  return new RedisStore({ client, prefix: 'pulse:sess:' });
}

if (!config.spotify.clientId || !config.spotify.clientSecret) {
  logger.warn('SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET not set — login will fail');
}

const sessionStore = await createStore();
const app = createApp(config, { sessionStore, logger });

app.listen(config.port, '0.0.0.0', () => {
  logger.info({ port: config.port, env: config.nodeEnv }, 'server listening');
});
