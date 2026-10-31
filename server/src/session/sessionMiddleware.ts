import session, { type Store } from 'express-session';
import type { AppConfig } from '../config.js';

export const SESSION_COOKIE = 'pulse.sid';
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export function createSessionMiddleware(config: AppConfig, store?: Store) {
  if (config.isProd && !store) {
    throw new Error('A persistent session store (Redis) is required in production');
  }
  return session({
    name: SESSION_COOKIE,
    secret: config.sessionSecret,
    store,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: config.isProd,
      maxAge: THIRTY_DAYS_MS,
    },
  });
}
