import type { Request } from 'express';
import type { AppConfig } from '../config.js';
import { HttpError } from '../middleware/errorHandler.js';
import { getValidAccessToken } from '../session/tokens.js';

export const API_BASE = 'https://api.spotify.com/v1';

export interface SpotifyClientOptions {
  /** Max 5xx retries (contract: 2). */
  maxServerRetries?: number;
  /** Longest Retry-After (seconds) we'll wait in-process before surfacing a 429. */
  maxRetryAfterSec?: number;
  sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

async function readError(res: Response): Promise<{ message?: string; reason?: string }> {
  const body = (await res.json().catch(() => null)) as {
    error?: { message?: string; reason?: string } | string;
  } | null;
  if (body && typeof body.error === 'object') return body.error;
  if (body && typeof body.error === 'string') return { message: body.error };
  return {};
}

export function createSpotifyClient(
  req: Request,
  config: AppConfig,
  opts: SpotifyClientOptions = {},
) {
  const { maxServerRetries = 2, maxRetryAfterSec = 5, sleep = defaultSleep } = opts;

  async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    let refreshed = false;
    let serverRetries = 0;
    let rateLimitRetried = false;

    for (;;) {
      const token = await getValidAccessToken(req, config, { force: false });
      const res = await fetch(`${API_BASE}${path}`, {
        ...init,
        headers: {
          ...(init.body ? { 'Content-Type': 'application/json' } : {}),
          ...init.headers,
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        if (res.status === 204) return undefined as T;
        const text = await res.text();
        if (!text) return undefined as T;
        try {
          return JSON.parse(text) as T;
        } catch {
          return undefined as T; // some player endpoints reply 200 with a non-JSON body
        }
      }

      if (res.status === 401) {
        if (refreshed)
          throw new HttpError(401, 'UNAUTHENTICATED', 'Spotify rejected the access token');
        refreshed = true;
        await getValidAccessToken(req, config, { force: true });
        continue;
      }

      if (res.status === 403) {
        const { message } = await readError(res);
        throw new HttpError(403, 'FORBIDDEN', message ?? 'Forbidden');
      }

      if (res.status === 404 && path.startsWith('/me/player')) {
        throw new HttpError(404, 'NO_ACTIVE_DEVICE', 'No active device');
      }

      if (res.status === 429) {
        const { message, reason } = await readError(res);
        const retryAfter = Number(res.headers.get('Retry-After') ?? '1') || 1;
        if (reason === 'QUOTA_EXCEEDED' || /quota/i.test(message ?? '')) {
          throw new HttpError(429, 'QUOTA_EXCEEDED', 'Spotify API quota exceeded');
        }
        if (!rateLimitRetried && retryAfter <= maxRetryAfterSec) {
          rateLimitRetried = true;
          await sleep(retryAfter * 1000);
          continue;
        }
        throw new HttpError(429, 'RATE_LIMITED', 'Too many requests to Spotify', { retryAfter });
      }

      if (res.status >= 500) {
        if (serverRetries < maxServerRetries) {
          await sleep(250 * 2 ** serverRetries);
          serverRetries++;
          continue;
        }
        throw new HttpError(502, 'UPSTREAM_ERROR', 'Spotify is having trouble right now');
      }

      const { message } = await readError(res);
      throw new HttpError(res.status, 'SPOTIFY_ERROR', message ?? `Spotify error ${res.status}`);
    }
  }

  return { request };
}
