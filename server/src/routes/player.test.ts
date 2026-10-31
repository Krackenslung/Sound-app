import { HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { login, newAgent } from '../test/helpers.js';
import { createMockState, createSpotifyMock } from '../test/spotifyMock.js';
import { apiRecorder, type RecordedCall } from '../test/spotifyApiRecorder.js';

const state = createMockState();
const mock = createSpotifyMock(state);
const calls: RecordedCall[] = [];

beforeAll(() =>
  mock.listen({
    // Fail loudly on any unmocked Spotify call; let supertest's local requests through.
    onUnhandledRequest: (req, print) => {
      if (new URL(req.url).hostname !== '127.0.0.1') print.error();
    },
  }),
);
afterAll(() => mock.close());
beforeEach(() => {
  Object.assign(state, createMockState());
  calls.length = 0;
  mock.use(apiRecorder(calls));
});
afterEach(() => mock.resetHandlers());

const track = {
  id: 't1',
  uri: 'spotify:track:t1',
  name: 'Neon Avenue',
  duration_ms: 227000,
  explicit: false,
  artists: [{ id: 'a1', name: 'The Midnight Coast', uri: 'spotify:artist:a1' }],
  album: {
    id: 'al1',
    name: 'Afterglow City',
    uri: 'spotify:album:al1',
    images: [{ url: 'https://i.scdn.co/image/x', width: 640, height: 640 }],
  },
};

describe('/api/player', () => {
  it('requires auth', async () => {
    expect((await newAgent().get('/api/player')).status).toBe(401);
    expect((await newAgent().put('/api/player/pause')).status).toBe(401);
  });

  it('GET returns null when Spotify has no active playback (204)', async () => {
    const { agent } = await login();
    const res = await agent.get('/api/player');
    expect(res.status).toBe(200);
    expect(res.body).toBeNull();
  });

  it('GET maps the playback state', async () => {
    mock.use(
      apiRecorder(calls, (c) =>
        c.path === '/me/player' && c.method === 'GET'
          ? HttpResponse.json({
              device: {
                id: 'd1',
                name: 'Phone',
                type: 'Smartphone',
                is_active: true,
                volume_percent: 40,
              },
              shuffle_state: true,
              repeat_state: 'context',
              timestamp: 1,
              progress_ms: 72000,
              is_playing: true,
              item: track,
              context: { uri: 'spotify:album:al1' },
            })
          : undefined,
      ),
    );
    const { agent } = await login();
    const res = await agent.get('/api/player');
    expect(res.body).toEqual({
      device: { id: 'd1', name: 'Phone', type: 'Smartphone', volumePercent: 40 },
      isPlaying: true,
      progressMs: 72000,
      shuffle: true,
      repeat: 'context',
      contextUri: 'spotify:album:al1',
      track: {
        id: 't1',
        uri: 'spotify:track:t1',
        name: 'Neon Avenue',
        durationMs: 227000,
        explicit: false,
        artists: [{ id: 'a1', name: 'The Midnight Coast', uri: 'spotify:artist:a1' }],
        album: {
          id: 'al1',
          name: 'Afterglow City',
          uri: 'spotify:album:al1',
          images: [{ url: 'https://i.scdn.co/image/x', width: 640, height: 640 }],
          artists: [],
        },
      },
    });
  });

  it('transfers playback to a device', async () => {
    const { agent } = await login();
    const res = await agent
      .put('/api/player/transfer')
      .send({ deviceId: 'web-device', play: false });
    expect(res.status).toBe(204);
    expect(calls.at(-1)).toMatchObject({
      method: 'PUT',
      path: '/me/player',
      body: { device_ids: ['web-device'], play: false },
    });
  });

  it('plays a list of track URIs on a specific device', async () => {
    const { agent } = await login();
    await agent
      .put('/api/player/play')
      .send({
        deviceId: 'web-device',
        uris: ['spotify:track:t1', 'spotify:track:t2'],
        offset: { position: 1 },
      })
      .expect(204);
    const call = calls.at(-1)!;
    expect(call.path).toBe('/me/player/play');
    expect(call.search.get('device_id')).toBe('web-device');
    expect(call.body).toEqual({
      uris: ['spotify:track:t1', 'spotify:track:t2'],
      offset: { position: 1 },
    });
  });

  it('plays an album context from a given track', async () => {
    const { agent } = await login();
    await agent
      .put('/api/player/play')
      .send({ contextUri: 'spotify:album:al1', offset: { uri: 'spotify:track:t1' } })
      .expect(204);
    expect(calls.at(-1)!.body).toEqual({
      context_uri: 'spotify:album:al1',
      offset: { uri: 'spotify:track:t1' },
    });
  });

  it('resumes without a body', async () => {
    const { agent } = await login();
    await agent.put('/api/player/play').send({}).expect(204);
    expect(calls.at(-1)!.body).toBeUndefined();
  });

  it.each([
    [{ uris: ['spotify:album:nope'] }, /uris/],
    [{ contextUri: 'https://evil.example' }, /contextUri/],
    [{ deviceId: '../../etc' }, /deviceId/],
    [{ contextUri: 'spotify:album:a', uris: ['spotify:track:t'] }, /not both/],
  ])('rejects invalid play bodies %j', async (body, msg) => {
    const { agent } = await login();
    const res = await agent.put('/api/player/play').send(body);
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(msg);
    expect(calls).toHaveLength(0);
  });

  it.each([
    ['put', '/pause', {}, 'PUT', '/me/player/pause', ''],
    ['post', '/next', {}, 'POST', '/me/player/next', ''],
    ['post', '/previous', { deviceId: 'd1' }, 'POST', '/me/player/previous', 'device_id=d1'],
    ['put', '/seek', { positionMs: 60000 }, 'PUT', '/me/player/seek', 'position_ms=60000'],
    [
      'put',
      '/volume',
      { percent: 70, deviceId: 'd1' },
      'PUT',
      '/me/player/volume',
      'volume_percent=70&device_id=d1',
    ],
    ['put', '/shuffle', { state: true }, 'PUT', '/me/player/shuffle', 'state=true'],
    ['put', '/repeat', { state: 'track' }, 'PUT', '/me/player/repeat', 'state=track'],
  ] as const)('%s %s forwards to Spotify', async (m, route, body, method, path, search) => {
    const { agent } = await login();
    await agent[m](`/api/player${route}`).send(body).expect(204);
    const call = calls.at(-1)!;
    expect(call.method).toBe(method);
    expect(call.path).toBe(path);
    expect(call.search.toString()).toBe(search);
  });

  it.each([
    ['/seek', { positionMs: -1 }],
    ['/volume', { percent: 101 }],
    ['/shuffle', { state: 'yes' }],
    ['/repeat', { state: 'forever' }],
  ])('validates %s', async (route, body) => {
    const { agent } = await login();
    expect((await agent.put(`/api/player${route}`).send(body)).status).toBe(400);
  });

  it('maps a 404 from /me/player/* to NO_ACTIVE_DEVICE', async () => {
    mock.use(
      apiRecorder(calls, () =>
        HttpResponse.json(
          { error: { status: 404, message: 'Player command failed: No active device found' } },
          { status: 404 },
        ),
      ),
    );
    const { agent } = await login();
    const res = await agent.put('/api/player/pause');
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('NO_ACTIVE_DEVICE');
  });

  it('maps a Premium-required 403 to FORBIDDEN with the message', async () => {
    mock.use(
      apiRecorder(calls, () =>
        HttpResponse.json(
          {
            error: {
              status: 403,
              message: 'Player command failed: Premium required',
              reason: 'PREMIUM_REQUIRED',
            },
          },
          { status: 403 },
        ),
      ),
    );
    const { agent } = await login();
    const res = await agent.put('/api/player/play').send({});
    expect(res.status).toBe(403);
    expect(res.body).toEqual({
      code: 'FORBIDDEN',
      message: 'Player command failed: Premium required',
    });
  });
});

describe('/api/me home data', () => {
  it('GET /api/me/top/tracks maps tracks and validates params', async () => {
    mock.use(
      apiRecorder(calls, (c) =>
        c.path === '/me/top/tracks'
          ? HttpResponse.json({ items: [track], limit: 5, next: null })
          : undefined,
      ),
    );
    const { agent } = await login();
    const res = await agent.get('/api/me/top/tracks?limit=5');
    expect(res.status).toBe(200);
    expect(res.body.items[0]).toMatchObject({ uri: 'spotify:track:t1', durationMs: 227000 });
    expect(calls.at(-1)!.search.toString()).toBe('time_range=short_term&limit=5');
    expect((await agent.get('/api/me/top/tracks?time_range=forever')).status).toBe(400);
    expect((await agent.get('/api/me/top/tracks?limit=500')).status).toBe(400);
  });

  it('GET /api/me/recently-played maps items', async () => {
    mock.use(
      apiRecorder(calls, (c) =>
        c.path === '/me/player/recently-played'
          ? HttpResponse.json({
              items: [{ track, played_at: '2026-10-31T10:00:00Z', context: null }],
              limit: 20,
              next: null,
            })
          : undefined,
      ),
    );
    const { agent } = await login();
    const res = await agent.get('/api/me/recently-played');
    expect(res.body.items).toEqual([
      expect.objectContaining({ playedAt: '2026-10-31T10:00:00Z', contextUri: null }),
    ]);
    expect(res.body.items[0].track.album.name).toBe('Afterglow City');
  });
});

describe('/api/library', () => {
  it('GET /contains returns a uri → boolean map using /me/library/contains', async () => {
    mock.use(
      apiRecorder(calls, (c) =>
        c.path === '/me/library/contains' ? HttpResponse.json([true, false]) : undefined,
      ),
    );
    const { agent } = await login();
    const res = await agent.get('/api/library/contains?uris=spotify:track:a,spotify:track:b');
    expect(res.body).toEqual({ 'spotify:track:a': true, 'spotify:track:b': false });
    expect(calls.at(-1)!.search.get('uris')).toBe('spotify:track:a,spotify:track:b');
  });

  it('PUT and DELETE save/remove URIs via /me/library', async () => {
    const { agent } = await login();
    await agent
      .put('/api/library')
      .send({ uris: ['spotify:track:a'] })
      .expect(204);
    expect(calls.at(-1)).toMatchObject({ method: 'PUT', path: '/me/library' });
    expect(calls.at(-1)!.search.get('uris')).toBe('spotify:track:a');
    await agent
      .delete('/api/library')
      .send({ uris: ['spotify:track:a'] })
      .expect(204);
    expect(calls.at(-1)).toMatchObject({ method: 'DELETE', path: '/me/library' });
  });

  it('rejects non-track URIs', async () => {
    const { agent } = await login();
    expect((await agent.put('/api/library').send({ uris: ['spotify:album:x'] })).status).toBe(400);
    expect((await agent.get('/api/library/contains?uris=')).status).toBe(400);
  });
});
