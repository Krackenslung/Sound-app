import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import type { Store } from 'express-session';
import cors from 'cors';
import { loadConfig, type AppConfig } from './config.js';
import { healthRouter } from './routes/health.js';
import { createAuthRouter } from './routes/auth.js';
import { createMeRouter } from './routes/me.js';
import { createPlayerRouter } from './routes/player.js';
import { createLibraryRouter } from './routes/library.js';
import { createSearchRouter } from './routes/search.js';
import { createCatalogRouter } from './routes/catalog.js';
import { createPlaylistsRouter } from './routes/playlists.js';
import { createSessionMiddleware } from './session/sessionMiddleware.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { createLogger, httpLogger, type Logger } from './logger.js';
import { securityHeaders } from './middleware/security.js';
import {
  apiRateLimit,
  authRateLimit,
  DEFAULT_RATE_LIMITS,
  type RateLimits,
} from './middleware/rateLimit.js';

const publicDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public');

export interface AppDeps {
  sessionStore?: Store;
  logger?: Logger;
  rateLimits?: RateLimits;
}

export function createApp(config: AppConfig = loadConfig(), deps: AppDeps = {}) {
  const app = express();
  app.disable('x-powered-by');
  const logger = deps.logger ?? createLogger(config);
  app.use(httpLogger(logger));
  // Behind Caddy in production: needed so `secure` cookies are set over the proxied HTTPS connection.
  if (config.isProd) app.set('trust proxy', 1);
  app.use(securityHeaders(config));
  app.use(cors({ origin: config.appOrigin, credentials: true }));
  // Largest legitimate body is ~4 KB (100 track URIs).
  app.use(express.json({ limit: '16kb' }));

  app.use('/api/health', healthRouter);

  const limits = deps.rateLimits ?? DEFAULT_RATE_LIMITS;
  app.use(['/api/auth/login', '/api/auth/callback'], authRateLimit(limits));
  app.use('/api', apiRateLimit(limits));

  app.use('/api', createSessionMiddleware(config, deps.sessionStore));
  app.use('/api/auth', createAuthRouter(config));
  app.use('/api/me', createMeRouter(config));
  app.use('/api/player', createPlayerRouter(config));
  app.use('/api/library', createLibraryRouter(config));
  app.use('/api/search', createSearchRouter(config));
  app.use('/api/playlists', createPlaylistsRouter(config));
  app.use('/api', createCatalogRouter(config));
  app.use('/api', notFound);

  if (config.isProd) {
    app.use(express.static(publicDir));
    app.get('/{*splat}', (_req, res) => res.sendFile(path.join(publicDir, 'index.html')));
  }

  app.use(errorHandler);
  return app;
}
