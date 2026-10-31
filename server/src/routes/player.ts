import { Router, type Request } from 'express';
import type { AppConfig } from '../config.js';
import { requireAuth } from '../middleware/requireAuth.js';
import {
  DEVICE_ID,
  SPOTIFY_URI,
  TRACK_URI,
  enumParam,
  intParam,
  optionalString,
  uriList,
} from '../middleware/validate.js';
import { HttpError } from '../middleware/errorHandler.js';
import { createSpotifyClient } from '../spotify/spotifyClient.js';
import { isTrack, toDevice, toPlaybackState, toTrack } from '../spotify/mappers.js';
import type { SpotifyDevice, SpotifyPlaybackState, SpotifyTrack } from '../spotify/types.js';

function deviceQuery(req: Request) {
  const deviceId = optionalString(req.body?.deviceId, 'deviceId', DEVICE_ID);
  return deviceId ? `?device_id=${encodeURIComponent(deviceId)}` : '';
}

export function createPlayerRouter(config: AppConfig) {
  const router = Router();
  router.use(requireAuth);
  const client = (req: Request) => createSpotifyClient(req, config);

  /** Current playback state, or `null` when nothing is active. */
  router.get('/', async (req, res, next) => {
    try {
      const state = await client(req).request<SpotifyPlaybackState | undefined>('/me/player');
      res.set('Cache-Control', 'no-store');
      res.json(state ? toPlaybackState(state) : null);
    } catch (err) {
      next(err);
    }
  });

  router.get('/devices', async (req, res, next) => {
    try {
      const r = await client(req).request<{ devices: SpotifyDevice[] }>('/me/player/devices');
      res.set('Cache-Control', 'no-store');
      res.json({ devices: (r?.devices ?? []).map(toDevice) });
    } catch (err) {
      next(err);
    }
  });

  router.get('/queue', async (req, res, next) => {
    try {
      const r = await client(req).request<{
        currently_playing: SpotifyTrack | null;
        queue: SpotifyTrack[];
      }>('/me/player/queue');
      res.set('Cache-Control', 'no-store');
      res.json({
        currentlyPlaying: isTrack(r?.currently_playing) ? toTrack(r.currently_playing) : null,
        queue: (r?.queue ?? []).filter(isTrack).map(toTrack),
      });
    } catch (err) {
      next(err);
    }
  });

  router.post('/queue', async (req, res, next) => {
    try {
      const uri = optionalString(req.body?.uri, 'uri', TRACK_URI);
      if (!uri) throw new HttpError(400, 'BAD_REQUEST', 'uri is required');
      const dq = deviceQuery(req);
      await client(req).request(
        `/me/player/queue?uri=${encodeURIComponent(uri)}${dq.replace('?', '&')}`,
        { method: 'POST' },
      );
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  });

  router.put('/transfer', async (req, res, next) => {
    try {
      const deviceId = optionalString(req.body?.deviceId, 'deviceId', DEVICE_ID);
      if (!deviceId) throw new HttpError(400, 'BAD_REQUEST', 'deviceId is required');
      await client(req).request('/me/player', {
        method: 'PUT',
        body: JSON.stringify({ device_ids: [deviceId], play: Boolean(req.body?.play) }),
      });
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  });

  router.put('/play', async (req, res, next) => {
    try {
      const b = req.body ?? {};
      const body: Record<string, unknown> = {};
      const contextUri = optionalString(b.contextUri, 'contextUri', SPOTIFY_URI);
      if (contextUri) body.context_uri = contextUri;
      if (b.uris !== undefined)
        body.uris = uriList(b.uris, 'uris', { max: 100, pattern: TRACK_URI });
      if (contextUri && body.uris)
        throw new HttpError(400, 'BAD_REQUEST', 'Use contextUri or uris, not both');
      if (b.offset !== undefined) {
        const uri = optionalString(b.offset?.uri, 'offset.uri', TRACK_URI);
        body.offset = uri
          ? { uri }
          : {
              position: intParam(b.offset?.position, {
                name: 'offset.position',
                min: 0,
                max: 10_000,
              }),
            };
      }
      if (b.positionMs !== undefined) {
        body.position_ms = intParam(b.positionMs, {
          name: 'positionMs',
          min: 0,
          max: 24 * 3_600_000,
        });
      }
      const hasBody = Object.keys(body).length > 0;
      await client(req).request(`/me/player/play${deviceQuery(req)}`, {
        method: 'PUT',
        ...(hasBody ? { body: JSON.stringify(body) } : {}),
      });
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  });

  router.put('/pause', async (req, res, next) => {
    try {
      await client(req).request(`/me/player/pause${deviceQuery(req)}`, { method: 'PUT' });
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  });

  for (const dir of ['next', 'previous'] as const) {
    router.post(`/${dir}`, async (req, res, next) => {
      try {
        await client(req).request(`/me/player/${dir}${deviceQuery(req)}`, { method: 'POST' });
        res.status(204).end();
      } catch (err) {
        next(err);
      }
    });
  }

  router.put('/seek', async (req, res, next) => {
    try {
      const ms = intParam(req.body?.positionMs, {
        name: 'positionMs',
        min: 0,
        max: 24 * 3_600_000,
      });
      const dq = deviceQuery(req);
      await client(req).request(`/me/player/seek?position_ms=${ms}${dq.replace('?', '&')}`, {
        method: 'PUT',
      });
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  });

  router.put('/volume', async (req, res, next) => {
    try {
      const pct = intParam(req.body?.percent, { name: 'percent', min: 0, max: 100 });
      const dq = deviceQuery(req);
      await client(req).request(`/me/player/volume?volume_percent=${pct}${dq.replace('?', '&')}`, {
        method: 'PUT',
      });
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  });

  router.put('/shuffle', async (req, res, next) => {
    try {
      if (typeof req.body?.state !== 'boolean') {
        throw new HttpError(400, 'BAD_REQUEST', 'state must be a boolean');
      }
      const dq = deviceQuery(req);
      await client(req).request(
        `/me/player/shuffle?state=${req.body.state}${dq.replace('?', '&')}`,
        {
          method: 'PUT',
        },
      );
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  });

  router.put('/repeat', async (req, res, next) => {
    try {
      const state = enumParam(req.body?.state, 'state', ['off', 'track', 'context'] as const);
      const dq = deviceQuery(req);
      await client(req).request(`/me/player/repeat?state=${state}${dq.replace('?', '&')}`, {
        method: 'PUT',
      });
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  });

  return router;
}
