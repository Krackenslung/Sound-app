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
    onUnhandledRequest: (req, print) => {
      if (new URL(req.url).hostname !== '127.0.0.1') print.error();
    },
  }),
);
afterAll(() => mock.close());
beforeEach(() => {
  Object.assign(state, createMockState());
  calls.length = 0;
});
afterEach(() => mock.resetHandlers());

const respond = (handler: (c: RecordedCall) => Response | undefined) =>
  mock.use(apiRecorder(calls, handler));

const artist = { id: 'a1', name: 'Artist', uri: 'spotify:artist:a1' };
const track = (n: number) => ({
  id: `t${n}`,
  uri: `spotify:track:t${n}`,
  name: `Track ${n}`,
  duration_ms: 200000,
  artists: [artist],
  album: { id: 'al1', name: 'Album', uri: 'spotify:album:al1', images: [] },
  type: 'track',
});
const playlist = (id: string, ownerId: string, extra = {}) => ({
  id,
  uri: `spotify:playlist:${id}`,
  name: `Playlist ${id}`,
  images: [],
  owner: { id: ownerId, display_name: ownerId },
  collaborative: false,
  items: { total: 3 },
  ...extra,
});

describe('GET /api/library/tracks and /albums', () => {
  it('lists Liked Songs with added dates and paging', async () => {
    respond((c) =>
      c.path === '/me/tracks'
        ? HttpResponse.json({
            items: [{ added_at: '2026-10-01T00:00:00Z', track: track(1) }],
            total: 248,
            limit: 50,
            next: 'x',
          })
        : undefined,
    );
    const { agent } = await login();
    const res = await agent.get('/api/library/tracks?offset=50');
    expect(calls.at(-1)!.search.toString()).toBe('limit=50&offset=50');
    expect(res.body).toMatchObject({ offset: 50, total: 248, nextOffset: 100 });
    expect(res.body.items[0]).toMatchObject({
      addedAt: '2026-10-01T00:00:00Z',
      track: { uri: 'spotify:track:t1' },
    });
  });

  it.each([403, 404, 410])(
    'reports ENDPOINT_UNAVAILABLE when Spotify answers %s',
    async (status) => {
      respond(() => HttpResponse.json({ error: { status, message: 'gone' } }, { status }));
      const { agent } = await login();
      const tracks = await agent.get('/api/library/tracks');
      expect(tracks.status).toBe(501);
      expect(tracks.body.code).toBe('ENDPOINT_UNAVAILABLE');
      expect((await agent.get('/api/library/albums')).body.code).toBe('ENDPOINT_UNAVAILABLE');
    },
  );
});

describe('/api/playlists', () => {
  it('lists my playlists with ownership/editability (uses GET /me/playlists)', async () => {
    respond((c) =>
      c.path === '/me/playlists'
        ? HttpResponse.json({
            items: [
              playlist('p1', 'jg'),
              playlist('p2', 'someone', { collaborative: true }),
              playlist('p3', 'spotify'),
              null,
            ],
            total: 3,
            limit: 50,
            next: null,
          })
        : undefined,
    );
    const { agent } = await login();
    const res = await agent.get('/api/playlists');
    expect(res.status).toBe(200);
    expect(
      res.body.items.map((p: { id: string; isOwner: boolean; editable: boolean }) => [
        p.id,
        p.isOwner,
        p.editable,
      ]),
    ).toEqual([
      ['p1', true, true],
      ['p2', false, true],
      ['p3', false, false],
    ]);
    expect(res.body.items[0].totalItems).toBe(3);
    expect(calls.some((c) => c.path.startsWith('/users/'))).toBe(false);
  });

  it('creates a playlist with POST /me/playlists', async () => {
    respond((c) =>
      c.path === '/me/playlists' && c.method === 'POST'
        ? HttpResponse.json(playlist('new', 'jg'), { status: 201 })
        : undefined,
    );
    const { agent } = await login();
    const res = await agent
      .post('/api/playlists')
      .send({ name: '  Road trip  ', description: 'vibes' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ id: 'new', isOwner: true, editable: true });
    expect(calls.find((c) => c.method === 'POST')!.body).toEqual({
      name: 'Road trip',
      public: false,
      description: 'vibes',
    });
  });

  it.each([{}, { name: '' }, { name: 'x'.repeat(101) }, { name: 'ok', description: 5 }])(
    'validates create body %j',
    async (body) => {
      const { agent } = await login();
      expect((await agent.post('/api/playlists').send(body)).status).toBe(400);
    },
  );

  it('reads items from the /items endpoint, accepting `item` and legacy `track` fields', async () => {
    respond((c) =>
      c.path === '/playlists/p1/items'
        ? HttpResponse.json({
            items: [
              { added_at: '2026-01-01T00:00:00Z', item: track(1), track: true },
              { added_at: null, track: track(2) },
              {
                added_at: null,
                item: { id: 'e', uri: 'spotify:episode:e', name: 'Pod', type: 'episode' },
              },
            ],
            total: 3,
            limit: 50,
            next: null,
          })
        : undefined,
    );
    const { agent } = await login();
    const res = await agent.get('/api/playlists/p1/items');
    expect(res.body.items.map((i: { track: { uri: string } }) => i.track.uri)).toEqual([
      'spotify:track:t1',
      'spotify:track:t2',
    ]);
    expect(res.body.nextOffset).toBeNull();
  });

  it("explains when Spotify won't return items for a playlist the user doesn't own", async () => {
    respond(() =>
      HttpResponse.json({ error: { status: 403, message: 'Forbidden' } }, { status: 403 }),
    );
    const { agent } = await login();
    const res = await agent.get('/api/playlists/p3/items');
    expect(res.status).toBe(501);
    expect(res.body).toMatchObject({
      code: 'ENDPOINT_UNAVAILABLE',
      message: expect.stringMatching(/own or collaborate/),
    });
  });

  it('adds items with a uris body and removes with items: [{ uri }]', async () => {
    respond((c) =>
      c.path === '/playlists/p1/items' ? HttpResponse.json({ snapshot_id: 'snap2' }) : undefined,
    );
    const { agent } = await login();
    const add = await agent.post('/api/playlists/p1/items').send({ uris: ['spotify:track:t1'] });
    expect(add.status).toBe(201);
    expect(add.body.snapshotId).toBe('snap2');
    expect(calls.at(-1)).toMatchObject({ method: 'POST', body: { uris: ['spotify:track:t1'] } });

    const del = await agent
      .delete('/api/playlists/p1/items')
      .send({ uris: ['spotify:track:t1'], snapshotId: 'snap2' });
    expect(del.status).toBe(200);
    expect(calls.at(-1)).toMatchObject({
      method: 'DELETE',
      body: { items: [{ uri: 'spotify:track:t1' }], snapshot_id: 'snap2' },
    });
  });

  it('validates ids and uris and requires auth', async () => {
    const { agent } = await login();
    expect(
      (await agent.post('/api/playlists/p1/items').send({ uris: ['spotify:album:x'] })).status,
    ).toBe(400);
    expect((await agent.get('/api/playlists/bad%2Fid')).status).toBe(400);
    expect((await newAgent().get('/api/playlists')).status).toBe(401);
  });
});
