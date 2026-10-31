import type { Store } from 'express-session';
import { RedisStore } from 'connect-redis';
import { createClient } from 'redis';
import { createApp } from './app.js';
import { loadConfig } from './config.js';
import { createLogger } from './logger.js';

const config = loadConfig();
const logger = createLogger(config);
const SHUTDOWN_TIMEOUT_MS = 10_000;

let redis: ReturnType<typeof createClient> | undefined;

async function createStore(): Promise<Store | undefined> {
  if (!config.redisUrl) {
    if (config.isProd) throw new Error('REDIS_URL is required in production');
    logger.warn('REDIS_URL not set — using in-memory sessions (development only)');
    return undefined;
  }
  redis = createClient({ url: config.redisUrl });
  redis.on('error', (err) => logger.error({ err: { message: err.message } }, 'redis error'));
  await redis.connect();
  return new RedisStore({ client: redis, prefix: 'pulse:sess:' });
}

if (!config.spotify.clientId || !config.spotify.clientSecret) {
  logger.warn('SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET not set — login will fail');
}

const sessionStore = await createStore();
const app = createApp(config, { sessionStore, logger });

const server = app.listen(config.port, '0.0.0.0', () => {
  logger.info({ port: config.port, env: config.nodeEnv }, 'server listening');
});

// Graceful shutdown for `docker compose up -d` / redeploys: stop accepting connections, let
// in-flight requests finish, then close Redis.
let shuttingDown = false;
async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, 'shutting down');
  const force = setTimeout(() => {
    logger.error('shutdown timed out; exiting');
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);
  force.unref();
  server.close(async () => {
    try {
      await redis?.quit();
    } catch {
      /* already closed */
    }
    logger.info('shutdown complete');
    process.exit(0);
  });
  server.closeIdleConnections();
}
process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
