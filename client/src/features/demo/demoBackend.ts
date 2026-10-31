import catalogJson from '@fixtures/catalog.json';
import libraryJson from '@fixtures/library.json';
import meJson from '@fixtures/me.json';
import devicesJson from '@fixtures/devices.json';
import { ApiError } from '@/api/client';
import type { AlbumSummary, Artist, Device, MyPlaylist, RepeatMode, Track } from '@/api/types';

/**
 * In-browser stand-in for the Pulse API used in demo mode. Same paths and response shapes as the
 * server, backed by /fixtures and in-memory state. Playback is simulated on a "Demo player" device
 * (no audio — Spotify doesn't provide previews to this app).
 */

const catalog = catalogJson as unknown as {
  artists: Artist[];
  albums: AlbumSummary[];
  tracks: Track[];
};
const library = libraryJson as unknown as {
  liked: { uri: string; daysAgo: number }[];
  savedAlbums: string[];
  playlists: {
    id: string;
    name: string;
    description: string | null;
    tracks: string[];
    collaborative?: boolean;
    ownerId?: string;
    ownerName?: string;
  }[];
  recentlyPlayed: { uri: string; minutesAgo: number }[];
  topTracks: Record<string, string[]>;
  topArtists: Record<string, string[]>;
};
const me = meJson as { id: string; displayName: string };
const fixtureDevices = (devicesJson as { devices: { id: string; name: string; type: string }[] })
  .devices;

const PAGE = 50;
const SEARCH_PAGE = 10;
const DEMO_DEVICE = fixtureDevices[0].id;

interface Playback {
  uris: string[];
  index: number;
  contextUri: string | null;
  positionMs: number;
  isPlaying: boolean;
  updatedAt: number;
}

interface DemoState {
  liked: { uri: string; addedAt: string }[];
  savedAlbums: string[];
  playlists: (MyPlaylist & { trackUris: string[] })[];
  playback: Playback | null;
  deviceId: string;
  volume: number;
  shuffle: boolean;
  repeat: RepeatMode;
  nextId: number;
}

const trackByUri = new Map(catalog.tracks.map((t) => [t.uri, t]));
const albumById = new Map(catalog.albums.map((a) => [a.id, a]));
const artistById = new Map(catalog.artists.map((a) => [a.id, a]));
const track = (uri: string) => {
  const t = trackByUri.get(uri);
  if (!t) throw new Error(`Unknown demo track ${uri}`);
  return t;
};

function initialState(now = Date.now()): DemoState {
  return {
    liked: library.liked.map((l) => ({
      uri: l.uri,
      addedAt: new Date(now - l.daysAgo * 86_400_000).toISOString(),
    })),
    savedAlbums: [...library.savedAlbums],
    playlists: library.playlists.map((p) => {
      const isOwner = !p.ownerId;
      return {
        id: p.id,
        uri: `spotify:playlist:${p.id}`,
        name: p.name,
        description: p.description,
        images: [],
        ownerId: p.ownerId ?? me.id,
        ownerName: p.ownerName ?? me.displayName,
        collaborative: Boolean(p.collaborative),
        totalItems: p.tracks.length,
        isOwner,
        editable: isOwner || Boolean(p.collaborative),
        trackUris: [...p.tracks],
      };
    }),
    playback: null,
    deviceId: DEMO_DEVICE,
    volume: 70,
    shuffle: false,
    repeat: 'off',
    nextId: 1,
  };
}

let state: DemoState | null = null;
const st = () => (state ??= initialState());

/** Start demo data from scratch (on entering/leaving demo mode, and in tests). */
export function resetDemoState() {
  state = null;
}

// --- helpers -------------------------------------------------------------------------------------

const fail = (status: number, code: string, message: string): never => {
  throw new ApiError(status, code, message);
};

const page = <T>(items: T[], offset: number, size = PAGE) => ({
  items: items.slice(offset, offset + size),
  offset,
  total: items.length,
  nextOffset: offset + size < items.length ? offset + size : null,
});

const intParam = (v: string | null, fallback: number) =>
  v == null || v === '' ? fallback : Number(v);

function stripPlaylist(p: DemoState['playlists'][number]): MyPlaylist {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { trackUris, ...rest } = p;
  return { ...rest, totalItems: trackUris.length };
}

function contextUris(contextUri: string): string[] {
  const [, kind, id] = contextUri.split(':');
  if (contextUri.endsWith(':collection')) return st().liked.map((l) => l.uri);
  if (kind === 'album') return catalog.tracks.filter((t) => t.album.id === id).map((t) => t.uri);
  if (kind === 'artist')
    return catalog.tracks.filter((t) => t.artists.some((a) => a.id === id)).map((t) => t.uri);
  if (kind === 'playlist') {
    const p = st().playlists.find((pl) => pl.id === id);
    if (p) return p.trackUris;
  }
  return fail(404, 'SPOTIFY_ERROR', 'Nothing to play in this demo context');
}

/** Moves simulated playback forward to "now", advancing tracks as they finish. */
function advance(now = Date.now()) {
  const pb = st().playback;
  if (!pb || !pb.isPlaying) return;
  pb.positionMs += now - pb.updatedAt;
  pb.updatedAt = now;
  for (let guard = 0; guard < 500; guard++) {
    const dur = track(pb.uris[pb.index]).durationMs;
    if (pb.positionMs < dur) return;
    pb.positionMs -= dur;
    if (st().repeat === 'track') continue;
    if (pb.index + 1 < pb.uris.length) pb.index++;
    else if (st().repeat === 'context') pb.index = 0;
    else {
      pb.isPlaying = false;
      pb.positionMs = 0;
      return;
    }
  }
}

function startPlayback(uris: string[], index: number, contextUri: string | null, positionMs = 0) {
  if (uris.length === 0) fail(404, 'SPOTIFY_ERROR', 'Nothing to play');
  let order = [...uris];
  let start = Math.min(Math.max(index, 0), order.length - 1);
  if (st().shuffle) {
    const first = order[start];
    const rest = order.filter((_, i) => i !== start).sort(() => Math.random() - 0.5);
    order = [first, ...rest];
    start = 0;
  }
  st().playback = {
    uris: order,
    index: start,
    contextUri,
    positionMs,
    isPlaying: true,
    updatedAt: Date.now(),
  };
}

function devices(): Device[] {
  const active = st().playback ? st().deviceId : null;
  return fixtureDevices.map((d) => ({
    id: d.id,
    name: d.name,
    type: d.type,
    isActive: d.id === active,
    volumePercent: d.id === active ? st().volume : null,
  }));
}

function playbackState() {
  advance();
  const pb = st().playback;
  if (!pb) return null;
  const d = devices().find((x) => x.id === st().deviceId)!;
  return {
    device: { id: d.id, name: d.name, type: d.type, volumePercent: st().volume },
    isPlaying: pb.isPlaying,
    progressMs: Math.round(pb.positionMs),
    shuffle: st().shuffle,
    repeat: st().repeat,
    contextUri: pb.contextUri,
    track: track(pb.uris[pb.index]),
  };
}

const requirePlayback = () => st().playback ?? fail(404, 'NO_ACTIVE_DEVICE', 'No active device');

const matches = (q: string, ...fields: string[]) => fields.some((f) => f.toLowerCase().includes(q));

// --- routes --------------------------------------------------------------------------------------

type Handler = (ctx: {
  params: string[];
  query: URLSearchParams;
  body: Record<string, unknown>;
}) => unknown;

const routes: Array<[string, RegExp, Handler]> = [
  ['GET', /^\/me$/, () => meJson],
  ['POST', /^\/auth\/logout$/, () => undefined],
  [
    'GET',
    /^\/auth\/token$/,
    () => fail(401, 'UNAUTHENTICATED', 'Demo mode has no Spotify session'),
  ],

  // Home & stats
  [
    'GET',
    /^\/me\/top\/tracks$/,
    ({ query }) => {
      const ids = library.topTracks[query.get('time_range') ?? 'short_term'] ?? [];
      return { items: ids.slice(0, intParam(query.get('limit'), 10)).map(track) };
    },
  ],
  [
    'GET',
    /^\/me\/top\/artists$/,
    ({ query }) => {
      const ids = library.topArtists[query.get('time_range') ?? 'short_term'] ?? [];
      return {
        items: ids.slice(0, intParam(query.get('limit'), 10)).map((id) => artistById.get(id)!),
      };
    },
  ],
  [
    'GET',
    /^\/me\/recently-played$/,
    ({ query }) => ({
      items: library.recentlyPlayed.slice(0, intParam(query.get('limit'), 20)).map((r) => ({
        track: track(r.uri),
        playedAt: new Date(Date.now() - r.minutesAgo * 60_000).toISOString(),
        contextUri: null,
      })),
    }),
  ],

  // Player
  ['GET', /^\/player$/, () => playbackState()],
  ['GET', /^\/player\/devices$/, () => ({ devices: devices() })],
  [
    'GET',
    /^\/player\/queue$/,
    () => {
      advance();
      const pb = st().playback;
      if (!pb) return { currentlyPlaying: null, queue: [] };
      return {
        currentlyPlaying: track(pb.uris[pb.index]),
        queue: pb.uris.slice(pb.index + 1, pb.index + 21).map(track),
      };
    },
  ],
  [
    'PUT',
    /^\/player\/play$/,
    ({ body }) => {
      advance();
      if (typeof body.deviceId === 'string') st().deviceId = body.deviceId;
      const offset = body.offset as { position?: number; uri?: string } | undefined;
      if (Array.isArray(body.uris)) {
        const uris = body.uris as string[];
        return startPlayback(
          uris,
          offset?.uri ? uris.indexOf(offset.uri) : (offset?.position ?? 0),
          null,
        );
      }
      if (typeof body.contextUri === 'string') {
        const uris = contextUris(body.contextUri);
        return startPlayback(
          uris,
          offset?.uri ? Math.max(0, uris.indexOf(offset.uri)) : (offset?.position ?? 0),
          body.contextUri,
        );
      }
      const pb = requirePlayback();
      pb.isPlaying = true;
      pb.updatedAt = Date.now();
    },
  ],
  [
    'PUT',
    /^\/player\/pause$/,
    () => {
      advance();
      requirePlayback().isPlaying = false;
    },
  ],
  [
    'POST',
    /^\/player\/(next|previous)$/,
    ({ params }) => {
      advance();
      const pb = requirePlayback();
      if (params[0] === 'next') pb.index = (pb.index + 1) % pb.uris.length;
      else if (pb.positionMs > 3000) pb.positionMs = 0;
      else pb.index = Math.max(0, pb.index - 1);
      pb.positionMs = 0;
      pb.updatedAt = Date.now();
    },
  ],
  [
    'PUT',
    /^\/player\/seek$/,
    ({ body }) => {
      const pb = requirePlayback();
      pb.positionMs = Math.min(
        Number(body.positionMs) || 0,
        track(pb.uris[pb.index]).durationMs - 1,
      );
      pb.updatedAt = Date.now();
    },
  ],
  [
    'PUT',
    /^\/player\/volume$/,
    ({ body }) => {
      st().volume = Number(body.percent);
    },
  ],
  [
    'PUT',
    /^\/player\/shuffle$/,
    ({ body }) => {
      st().shuffle = Boolean(body.state);
    },
  ],
  [
    'PUT',
    /^\/player\/repeat$/,
    ({ body }) => {
      st().repeat = body.state as RepeatMode;
    },
  ],
  [
    'PUT',
    /^\/player\/transfer$/,
    ({ body }) => {
      advance();
      st().deviceId = String(body.deviceId);
      const pb = st().playback;
      if (pb && body.play) pb.isPlaying = true;
    },
  ],
  [
    'POST',
    /^\/player\/queue$/,
    ({ body }) => {
      advance();
      const pb = requirePlayback();
      pb.uris.splice(pb.index + 1, 0, track(String(body.uri)).uri);
    },
  ],

  // Library
  [
    'GET',
    /^\/library\/contains$/,
    ({ query }) => {
      const uris = (query.get('uris') ?? '').split(',').filter(Boolean);
      const liked = new Set(st().liked.map((l) => l.uri));
      return Object.fromEntries(uris.map((u) => [u, liked.has(u)]));
    },
  ],
  [
    'PUT',
    /^\/library$/,
    ({ body }) => {
      for (const uri of body.uris as string[]) {
        if (!st().liked.some((l) => l.uri === uri))
          st().liked.unshift({ uri, addedAt: new Date().toISOString() });
      }
    },
  ],
  [
    'DELETE',
    /^\/library$/,
    ({ body }) => {
      const drop = new Set(body.uris as string[]);
      st().liked = st().liked.filter((l) => !drop.has(l.uri));
    },
  ],
  [
    'GET',
    /^\/library\/tracks$/,
    ({ query }) =>
      page(
        st().liked.map((l) => ({ addedAt: l.addedAt, track: track(l.uri) })),
        intParam(query.get('offset'), 0),
      ),
  ],
  [
    'GET',
    /^\/library\/albums$/,
    ({ query }) =>
      page(
        st().savedAlbums.map((id) => albumById.get(id)!),
        intParam(query.get('offset'), 0),
      ),
  ],
  [
    'GET',
    /^\/library\/months$/,
    ({ query }) => {
      const months = intParam(query.get('months'), 12);
      const now = new Date();
      const counts = new Map<string, number>();
      for (const l of st().liked)
        counts.set(l.addedAt.slice(0, 7), (counts.get(l.addedAt.slice(0, 7)) ?? 0) + 1);
      return {
        items: Array.from({ length: months }, (_, i) => {
          const key = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1))
            .toISOString()
            .slice(0, 7);
          return { month: key, count: counts.get(key) ?? 0 };
        }),
        truncated: false,
      };
    },
  ],

  // Search & catalog
  [
    'GET',
    /^\/search$/,
    ({ query }) => {
      const q = (query.get('q') ?? '').trim().toLowerCase();
      const type = query.get('type') ?? 'track';
      const offset = intParam(query.get('offset'), 0);
      const all: unknown[] =
        type === 'album'
          ? catalog.albums.filter((a) => matches(q, a.name, ...a.artists.map((x) => x.name)))
          : type === 'artist'
            ? catalog.artists.filter((a) => matches(q, a.name))
            : type === 'playlist'
              ? st()
                  .playlists.filter((p) => matches(q, p.name))
                  .map(stripPlaylist)
              : catalog.tracks.filter((t) =>
                  matches(q, t.name, t.album.name, ...t.artists.map((x) => x.name)),
                );
      return { type, ...page(all, offset, SEARCH_PAGE) };
    },
  ],
  [
    'GET',
    /^\/albums\/([^/]+)$/,
    ({ params }) => {
      const a = albumById.get(params[0]) ?? fail(404, 'SPOTIFY_ERROR', 'Album not found');
      return { ...a, tracks: catalog.tracks.filter((t) => t.album.id === a.id) };
    },
  ],
  [
    'GET',
    /^\/artists\/([^/]+)$/,
    ({ params }) => artistById.get(params[0]) ?? fail(404, 'SPOTIFY_ERROR', 'Artist not found'),
  ],
  [
    'GET',
    /^\/artists\/([^/]+)\/albums$/,
    ({ params, query }) =>
      page(
        catalog.albums.filter((a) => a.artists.some((x) => x.id === params[0])),
        intParam(query.get('offset'), 0),
        10,
      ),
  ],

  // Playlists
  [
    'GET',
    /^\/playlists$/,
    ({ query }) => page(st().playlists.map(stripPlaylist), intParam(query.get('offset'), 0)),
  ],
  [
    'POST',
    /^\/playlists$/,
    ({ body }) => {
      const id = `demo${st().nextId++}`;
      const p = {
        id,
        uri: `spotify:playlist:${id}`,
        name: String(body.name).trim(),
        description: (body.description as string) ?? null,
        images: [],
        ownerId: me.id,
        ownerName: me.displayName,
        collaborative: false,
        totalItems: 0,
        isOwner: true,
        editable: true,
        trackUris: [] as string[],
      };
      st().playlists.unshift(p);
      return stripPlaylist(p);
    },
  ],
  [
    'POST',
    /^\/playlists\/monthly$/,
    ({ body }) => {
      const month = String(body.month);
      const uris = st()
        .liked.filter((l) => l.addedAt.startsWith(month))
        .reverse()
        .map((l) => l.uri);
      const label = new Date(`${month}-01T00:00:00Z`).toLocaleString('en-US', {
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
      });
      if (uris.length === 0) fail(400, 'EMPTY_MONTH', `You didn't like any songs in ${label}.`);
      const id = `demo${st().nextId++}`;
      const p = {
        id,
        uri: `spotify:playlist:${id}`,
        name: `Liked in ${label}`,
        description: `Songs you liked in ${label}. Made with Pulse Player.`,
        images: [],
        ownerId: me.id,
        ownerName: me.displayName,
        collaborative: false,
        totalItems: uris.length,
        isOwner: true,
        editable: true,
        trackUris: uris,
      };
      st().playlists.unshift(p);
      return { playlist: stripPlaylist(p), added: uris.length, truncated: false };
    },
  ],
  [
    'GET',
    /^\/playlists\/([^/]+)$/,
    ({ params }) =>
      stripPlaylist(
        st().playlists.find((p) => p.id === params[0]) ??
          fail(404, 'SPOTIFY_ERROR', 'Playlist not found'),
      ),
  ],
  [
    'GET',
    /^\/playlists\/([^/]+)\/items$/,
    ({ params, query }) => {
      const p =
        st().playlists.find((pl) => pl.id === params[0]) ??
        fail(404, 'SPOTIFY_ERROR', 'Playlist not found');
      return page(
        p.trackUris.map((u) => ({ addedAt: null, track: track(u) })),
        intParam(query.get('offset'), 0),
      );
    },
  ],
  [
    'POST',
    /^\/playlists\/([^/]+)\/items$/,
    ({ params, body }) => {
      const p =
        st().playlists.find((pl) => pl.id === params[0]) ??
        fail(404, 'SPOTIFY_ERROR', 'Playlist not found');
      p.trackUris.push(...(body.uris as string[]));
      return { snapshotId: `demo-${Date.now()}` };
    },
  ],
  [
    'DELETE',
    /^\/playlists\/([^/]+)\/items$/,
    ({ params, body }) => {
      const p =
        st().playlists.find((pl) => pl.id === params[0]) ??
        fail(404, 'SPOTIFY_ERROR', 'Playlist not found');
      const drop = new Set(body.uris as string[]);
      p.trackUris = p.trackUris.filter((u) => !drop.has(u));
      return { snapshotId: `demo-${Date.now()}` };
    },
  ],
];

const LATENCY_MS = import.meta.env.MODE === 'test' ? 0 : 120;

/** Handles an `/api` path (without the `/api` prefix) entirely in the browser. */
export async function demoRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const method = (init.method ?? 'GET').toUpperCase();
  const url = new URL(path, 'http://demo.local');
  const body =
    typeof init.body === 'string' && init.body
      ? (JSON.parse(init.body) as Record<string, unknown>)
      : {};
  if (LATENCY_MS) await new Promise((r) => setTimeout(r, LATENCY_MS));
  for (const [m, re, handler] of routes) {
    if (m !== method) continue;
    const match = url.pathname.match(re);
    if (match)
      return handler({
        params: match.slice(1).map(decodeURIComponent),
        query: url.searchParams,
        body,
      }) as T;
  }
  throw new ApiError(404, 'NOT_FOUND', `Demo mode doesn't support ${method} ${url.pathname}`);
}
