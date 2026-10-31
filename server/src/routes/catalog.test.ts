import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { API_BASE } from '../spotify/spotifyClient.js';
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

const artist = { id: 'a1', name: 'The Midnight Coast', uri: 'spotify:artist:a1' };
const albumRef = {
  id: 'al1',
  name: 'Afterglow City',
  uri: 'spotify:album:al1',
  images: [],
  artists: [artist],
};
const track = (n: number) => ({
  id: `t${n}`,
  uri: `spotify:track:t${n}`,
  name: `Track ${n}`,
  duration_ms: 200000,
  artists: [artist],
  album: albumRef,
  type: 'track',
});
const { album: _omit, ...albumTrack } = track(1);
void _omit;

function respond(handler: (c: RecordedCall) => Response | undefined) {
  mock.use(apiRecorder(calls, handler));
}

describe('GET /api/search', () => {
  it('searches one type with limit 10 and returns nextOffset', async () => {
    respond((c) =>
      c.path === '/search'
        ? HttpResponse.json({
            tracks: {
              items: [track(1), null, track(2)],
              total: 214,
              limit: 10,
              offset: 10,
              next: 'x',
            },
          })
        : undefined,
    );
    const { agent } = await login();
    const res = await agent.get('/api/search?q=neon&type=track&offset=10');
    expect(res.status).toBe(200);
    expect(calls.at(-1)!.search.toString()).toBe('q=neon&type=track&limit=10&offset=10');
    expect(res.body).toMatchObject({ type: 'track', offset: 10, total: 214, nextOffset: 20 });
    expect(res.body.items.map((t: { uri: string }) => t.uri)).toEqual([
      'spotify:track:t1',
      'spotify:track:t2',
    ]);
  });

  it('maps albums, artists and playlists and drops null playlist entries', async () => {
    respond((c) => {
      const type = c.search.get('type');
      if (type === 'album')
        return HttpResponse.json({
          albums: {
            items: [
              { ...albumRef, album_type: 'album', release_date: '2024-05-01', total_tracks: 9 },
            ],
            total: 1,
            limit: 10,
            next: null,
          },
        });
      if (type === 'artist')
        return HttpResponse.json({
          artists: {
            items: [{ ...artist, images: [], genres: ['synthwave'] }],
            total: 1,
            limit: 10,
            next: null,
          },
        });
      return HttpResponse.json({
        playlists: {
          items: [
            null,
            {
              id: 'p1',
              uri: 'spotify:playlist:p1',
              name: 'Drive',
              images: null,
              owner: { id: 'u', display_name: 'Jesus' },
              items: { total: 32 },
            },
          ],
          total: 2,
          limit: 10,
          next: null,
        },
      });
    });
    const { agent } = await login();
    const albums = await agent.get('/api/search?q=neon&type=album');
    expect(albums.body.items[0]).toMatchObject({
      name: 'Afterglow City',
      releaseDate: '2024-05-01',
      totalTracks: 9,
    });
    expect(albums.body.nextOffset).toBeNull();
    const artists = await agent.get('/api/search?q=neon&type=artist');
    expect(artists.body.items[0]).toMatchObject({
      name: 'The Midnight Coast',
      genres: ['synthwave'],
    });
    const playlists = await agent.get('/api/search?q=neon&type=playlist');
    expect(playlists.body.items).toEqual([
      expect.objectContaining({ name: 'Drive', ownerName: 'Jesus', totalItems: 32, images: [] }),
    ]);
  });

  it.each(['', 'q=', 'q=x&type=episode', 'q=x&offset=5000', `q=${'x'.repeat(201)}`])(
    'validates %s',
    async (qs) => {
      const { agent } = await login();
      expect((await agent.get(`/api/search?${qs}`)).status).toBe(400);
    },
  );
});

describe('albums and artists', () => {
  it('GET /api/albums/:id attaches the album to each track and follows pagination', async () => {
    respond((c) => {
      if (c.path === '/albums/al1')
        return HttpResponse.json({
          ...albumRef,
          release_date: '2024',
          total_tracks: 51,
          tracks: { items: Array(50).fill(albumTrack), limit: 50, next: 'more' },
        });
      if (c.path === '/albums/al1/tracks')
        return HttpResponse.json({ items: [albumTrack], limit: 50, next: null });
      return undefined;
    });
    const { agent } = await login();
    const res = await agent.get('/api/albums/al1');
    expect(res.status).toBe(200);
    expect(res.body.tracks).toHaveLength(51);
    expect(res.body.tracks[0].album).toMatchObject({
      uri: 'spotify:album:al1',
      name: 'Afterglow City',
    });
    expect(calls.at(-1)!.search.get('offset')).toBe('50');
  });

  it('GET /api/artists/:id and its albums (no top-tracks endpoint)', async () => {
    respond((c) => {
      if (c.path === '/artists/a1') return HttpResponse.json({ ...artist, images: [], genres: [] });
      if (c.path === '/artists/a1/albums')
        return HttpResponse.json({ items: [albumRef], total: 25, limit: 10, next: 'x' });
      return undefined;
    });
    const { agent } = await login();
    expect((await agent.get('/api/artists/a1')).body.name).toBe('The Midnight Coast');
    const albums = await agent.get('/api/artists/a1/albums?offset=10');
    expect(albums.body).toMatchObject({ offset: 10, total: 25, nextOffset: 20 });
    expect(calls.at(-1)!.search.get('include_groups')).toBe('album,single');
    expect(
      calls.some((c) => c.path.includes('top-tracks') || c.path.includes('related-artists')),
    ).toBe(false);
  });

  it('rejects malformed ids and requires auth', async () => {
    const { agent } = await login();
    expect((await agent.get('/api/albums/..%2Fme')).status).toBe(400);
    expect((await newAgent().get('/api/albums/al1')).status).toBe(401);
  });

  it('keeps unknown /api routes as JSON 404', async () => {
    expect((await newAgent().get('/api/nope')).status).toBe(404);
  });
});

describe('queue and devices', () => {
  it('GET /api/player/queue maps tracks and drops episodes', async () => {
    respond((c) =>
      c.path === '/me/player/queue'
        ? HttpResponse.json({
            currently_playing: track(1),
            queue: [track(2), { id: 'e', uri: 'spotify:episode:e', name: 'Pod', type: 'episode' }],
          })
        : undefined,
    );
    const { agent } = await login();
    const res = await agent.get('/api/player/queue');
    expect(res.body.currentlyPlaying.uri).toBe('spotify:track:t1');
    expect(res.body.queue.map((t: { uri: string }) => t.uri)).toEqual(['spotify:track:t2']);
  });

  it('POST /api/player/queue adds a track', async () => {
    respond(() => undefined);
    const { agent } = await login();
    await agent
      .post('/api/player/queue')
      .send({ uri: 'spotify:track:t9', deviceId: 'web' })
      .expect(204);
    expect(calls.at(-1)).toMatchObject({ method: 'POST', path: '/me/player/queue' });
    expect(calls.at(-1)!.search.toString()).toBe('uri=spotify%3Atrack%3At9&device_id=web');
    expect((await agent.post('/api/player/queue').send({ uri: 'spotify:album:x' })).status).toBe(
      400,
    );
  });

  it('GET /api/player/devices maps devices', async () => {
    respond((c) =>
      c.path === '/me/player/devices'
        ? HttpResponse.json({
            devices: [
              {
                id: 'd1',
                name: "Jesus's iPhone",
                type: 'Smartphone',
                is_active: true,
                volume_percent: 60,
              },
            ],
          })
        : undefined,
    );
    const { agent } = await login();
    const res = await agent.get('/api/player/devices');
    expect(res.body.devices).toEqual([
      { id: 'd1', name: "Jesus's iPhone", type: 'Smartphone', isActive: true, volumePercent: 60 },
    ]);
  });
});

describe('GET /api/me without product', () => {
  it('reports product as null instead of guessing "free"', async () => {
    mock.use(
      http.get(`${API_BASE}/me`, () =>
        HttpResponse.json({ id: 'jg', display_name: 'Jesus G.', images: [] }),
      ),
    );
    const { agent } = await login();
    const res = await agent.get('/api/me');
    expect(res.body.product).toBeNull();
  });
});
