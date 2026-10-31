import { rateLimit, type Options } from 'express-rate-limit';
import type { Request, Response } from 'express';

export interface RateLimits {
  windowMs: number;
  /** Requests per window per IP for /api/* (player polling is ~12/min). */
  api: number;
  /** Requests per window per IP for the OAuth endpoints. */
  auth: number;
}

export const DEFAULT_RATE_LIMITS: RateLimits = { windowMs: 60_000, api: 300, auth: 20 };

function limiter(windowMs: number, limit: number, message: string) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    // Per-IP, in-memory: fine for the single-instance deployment. `trust proxy` (prod) makes
    // req.ip the client address behind Caddy.
    handler: (req: Request, res: Response, _next, options: Options) => {
      const resetTime = (req as Request & { rateLimit?: { resetTime?: Date } }).rateLimit
        ?.resetTime;
      const retryAfter = Math.max(
        1,
        Math.ceil(((resetTime?.getTime() ?? Date.now() + options.windowMs) - Date.now()) / 1000),
      );
      res.set('Retry-After', String(retryAfter));
      res.status(429).json({ code: 'RATE_LIMITED', message, retryAfter });
    },
  });
}

export const apiRateLimit = (l: RateLimits) =>
  limiter(l.windowMs, l.api, 'Too many requests — please slow down.');

export const authRateLimit = (l: RateLimits) =>
  limiter(l.windowMs, l.auth, 'Too many login attempts — please wait a minute.');
