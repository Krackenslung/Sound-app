import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { loadConfig, type AppConfig } from './config.js';
import { healthRouter } from './routes/health.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

const publicDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public');

export function createApp(config: AppConfig = loadConfig()) {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: config.appOrigin, credentials: true }));
  app.use(express.json({ limit: '100kb' }));

  app.use('/api/health', healthRouter);
  app.use('/api', notFound);

  if (config.isProd) {
    app.use(express.static(publicDir));
    app.get('/{*splat}', (_req, res) => res.sendFile(path.join(publicDir, 'index.html')));
  }

  app.use(errorHandler);
  return app;
}
