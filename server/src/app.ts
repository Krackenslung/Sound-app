import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import type { Store } from 'express-session';
import helmet from 'helmet';
import cors from 'cors';
import { loadConfig, type AppConfig } from './config.js';
import { healthRouter } from './routes/health.js';
import { createAuthRouter } from './routes/auth.js';
import { createMeRouter } from './routes/me.js';
import { createPlayerRouter } from './routes/player.js';
import { createLibraryRouter } from './routes/library.js';
import { createSearchRouter } from './routes/search.js';
import { createCatalogRouter } from './routes/catalog.js';
import { createSessionMiddleware } from './session/sessionMiddleware.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

const publicDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public');

export interface AppDeps {
  sessionStore?: Store;
}

export function createApp(config: AppConfig = loadConfig(), deps: AppDeps = {}) {
  const app = express();
  app.disable('x-powered-by');
  // Behind Caddy in production: needed so `secure` cookies are set over the proxied HTTPS connection.
  if (config.isProd) app.set('trust proxy', 1);
  app.use(helmet());
  app.use(cors({ origin: config.appOrigin, credentials: true }));
  app.use(express.json({ limit: '100kb' }));

  app.use('/api/health', healthRouter);

  app.use('/api', createSessionMiddleware(config, deps.sessionStore));
  app.use('/api/auth', createAuthRouter(config));
  app.use('/api/me', createMeRouter(config));
  app.use('/api/player', createPlayerRouter(config));
  app.use('/api/library', createLibraryRouter(config));
  app.use('/api/search', createSearchRouter(config));
  app.use('/api', createCatalogRouter(config));
  app.use('/api', notFound);

  if (config.isProd) {
    app.use(express.static(publicDir));
    app.get('/{*splat}', (_req, res) => res.sendFile(path.join(publicDir, 'index.html')));
  }

  app.use(errorHandler);
  return app;
}
