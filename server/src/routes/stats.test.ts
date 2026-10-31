import { HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { login } from '../test/helpers.js';
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
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-31T12:00:00Z'));
});
afterEach(() => {
  mock.resetHandlers();
  vi.useRealTimers();
});

const respond = (handler: (c: RecordedCall) => Response | undefined) =>
  mock.use(apiRecorder(calls, handler));

const track = (n: number) => ({
  id: `t${n}`,
  uri: `spotify:track:t${n}`,
  name: `Track ${n}`,
  duration_ms: 200000,
  artists: [{ id: 'a1', name: 'Artist', uri: 'spotify:artist:a1' }],
  album: { id: 'al1', name: 'Album', uri: 'spotify:album:al1', images: [] },
  type: 'track',
});
const saved = (n: number, addedAt: string) => ({ added_at: addedAt, track: track(n) });

describe('GET /api/me/top/artists', () => {
  it('maps artists and keeps genres when Spotify sends them', async () => {
    respond((c) =>
      c.path === '/me/top/artists'
        ? HttpResponse.json({
            items: [
              { id: 'a1', uri: 'spotify:artist:a1', name: 'A', images: [], genres: ['synthwave'] },
            ],
            limit: 50,
            next: null,
          })
        : undefined,
    );
    const { agent } = await login();
    const res = await agent.get('/api/me/top/artists?time_range=long_term&limit=50');
    expect(calls.at(-1)!.search.toString()).toBe('time_range=long_term&limit=50');
    expect(res.body.items[0]).toMatchObject({ name: 'A', genres: ['synthwave'] });
  });

  it('reports genres as null when the field is missing (Feb 2026 Development Mode)', async () => {
    respond((c) =>
      c.path === '/me/top/artists'
        ? HttpResponse.json({
            items: [{ id: 'a1', uri: 'spotify:artist:a1', name: 'A', images: [] }],
            limit: 10,
            next: null,
          })
        : undefined,
    );
    const { agent } = await login();
    expect((await agent.get('/api/me/top/artists')).body.items[0].genres).toBeNull();
  });
});

describe('GET /api/library/months', () => {
  it('counts liked songs per UTC month and stops paging once past the window', async () => {
    respond((c) => {
      if (c.path !== '/me/tracks') return undefined;
      const offset = Number(c.search.get('offset'));
      if (offset === 0)
        return HttpResponse.json({
          items: [
            saved(1, '2026-10-30T10:00:00Z'),
            saved(2, '2026-10-01T00:00:00Z'),
            saved(3, '2026-09-15T00:00:00Z'),
          ],
          limit: 50,
          next: 'more',
        });
      return HttpResponse.json({
        items: [saved(4, '2026-08-31T23:59:59Z'), saved(5, '2026-07-01T00:00:00Z')],
        limit: 50,
        next: 'more',
      });
    });
    const { agent } = await login();
    const res = await agent.get('/api/library/months?months=3');
    expect(res.body).toEqual({
      items: [
        { month: '2026-10', count: 2 },
        { month: '2026-09', count: 1 },
        { month: '2026-08', count: 1 },
      ],
      truncated: false,
    });
    // Stopped after reaching July on the second page.
    expect(calls.filter((c) => c.path === '/me/tracks')).toHaveLength(2);
  });

  it('reports ENDPOINT_UNAVAILABLE when Liked Songs cannot be read', async () => {
    respond(() => HttpResponse.json({ error: { status: 403, message: 'no' } }, { status: 403 }));
    const { agent } = await login();
    const res = await agent.get('/api/library/months');
    expect(res.status).toBe(501);
    expect(res.body.code).toBe('ENDPOINT_UNAVAILABLE');
  });
});

describe('POST /api/playlists/monthly', () => {
  it('creates "Liked in <Month>" with that month’s songs, oldest first, in chunks', async () => {
    const october = Array.from({ length: 120 }, (_, i) =>
      saved(
        1000 + i,
        `2026-10-${String(30 - Math.floor(i / 5)).padStart(2, '0')}T${String(23 - (i % 5)).padStart(2, '0')}:00:00Z`,
      ),
    );
    respond((c) => {
      if (c.path === '/me/tracks') {
        const offset = Number(c.search.get('offset'));
        if (offset === 0)
          return HttpResponse.json({
            items: [saved(1, '2026-11-01T00:00:00Z'), ...october.slice(0, 49)],
            limit: 50,
            next: 'x',
          });
        if (offset === 50)
          return HttpResponse.json({ items: october.slice(49, 99), limit: 50, next: 'x' });
        return HttpResponse.json({
          items: [...october.slice(99), saved(2, '2026-09-30T23:00:00Z')],
          limit: 50,
          next: 'x',
        });
      }
      if (c.path === '/me/playlists' && c.method === 'POST')
        return HttpResponse.json(
          {
            id: 'm1',
            uri: 'spotify:playlist:m1',
            name: c.body && (c.body as { name: string }).name,
            images: [],
            owner: { id: 'jg' },
            items: { total: 0 },
          },
          { status: 201 },
        );
      if (c.path === '/playlists/m1/items')
        return HttpResponse.json({ snapshot_id: 's' }, { status: 201 });
      return undefined;
    });
    const { agent } = await login();
    const res = await agent.post('/api/playlists/monthly').send({ month: '2026-10' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      added: 120,
      truncated: false,
      playlist: { id: 'm1', name: 'Liked in October 2026', totalItems: 120 },
    });

    const create = calls.find((c) => c.path === '/me/playlists')!;
    expect(create.body).toMatchObject({ name: 'Liked in October 2026', public: false });
    const adds = calls.filter((c) => c.path === '/playlists/m1/items');
    expect(adds.map((c) => (c.body as { uris: string[] }).uris.length)).toEqual([100, 20]);
    const allUris = adds.flatMap((c) => (c.body as { uris: string[] }).uris);
    expect(allUris[0]).toBe(october.at(-1)!.track.uri); // oldest first
    expect(allUris).not.toContain('spotify:track:t1'); // November excluded
    expect(allUris).not.toContain('spotify:track:t2'); // September excluded
  });

  it('refuses an empty month without creating a playlist', async () => {
    respond((c) =>
      c.path === '/me/tracks'
        ? HttpResponse.json({ items: [saved(1, '2026-10-02T00:00:00Z')], limit: 50, next: null })
        : undefined,
    );
    const { agent } = await login();
    const res = await agent.post('/api/playlists/monthly').send({ month: '2026-06' });
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({
      code: 'EMPTY_MONTH',
      message: "You didn't like any songs in June 2026.",
    });
    expect(calls.some((c) => c.path === '/me/playlists')).toBe(false);
  });

  it.each([{}, { month: '2026-13' }, { month: 'October' }])('validates %j', async (body) => {
    const { agent } = await login();
    expect((await agent.post('/api/playlists/monthly').send(body)).status).toBe(400);
  });
});
