import type { Track } from '@/api/types';

export function makeTrack(n: number, overrides: Partial<Track> = {}): Track {
  return {
    id: `t${n}`,
    uri: `spotify:track:t${n}`,
    name: `Track ${n}`,
    durationMs: 200_000 + n * 1000,
    explicit: false,
    artists: [{ id: `a${n}`, name: `Artist ${n}`, uri: `spotify:artist:a${n}` }],
    album: {
      id: `al${n}`,
      name: `Album ${n}`,
      uri: `spotify:album:al${n}`,
      images: [{ url: `https://i.scdn.co/image/al${n}`, width: 300, height: 300 }],
      artists: [{ id: `a${n}`, name: `Artist ${n}`, uri: `spotify:artist:a${n}` }],
    },
    ...overrides,
  };
}
