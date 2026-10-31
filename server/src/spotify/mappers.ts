import type { SpotifyAlbumRef, SpotifyImage, SpotifyPlaybackState, SpotifyTrack } from './types.js';

export interface ImageDto {
  url: string;
  width: number | null;
  height: number | null;
}

export interface ArtistRefDto {
  id: string | null;
  name: string;
  uri: string;
}

export interface AlbumRefDto {
  id: string | null;
  name: string;
  uri: string;
  images: ImageDto[];
  artists: ArtistRefDto[];
}

export interface TrackDto {
  id: string | null;
  uri: string;
  name: string;
  durationMs: number;
  explicit: boolean;
  artists: ArtistRefDto[];
  album: AlbumRefDto;
}

export interface PlaybackStateDto {
  device: { id: string | null; name: string; type: string; volumePercent: number | null };
  isPlaying: boolean;
  progressMs: number;
  shuffle: boolean;
  repeat: 'off' | 'track' | 'context';
  contextUri: string | null;
  track: TrackDto | null;
}

const images = (imgs: SpotifyImage[] | undefined): ImageDto[] =>
  (imgs ?? []).map(({ url, width, height }) => ({ url, width, height }));

const artists = (a: SpotifyAlbumRef['artists']): ArtistRefDto[] =>
  (a ?? []).map(({ id, name, uri }) => ({ id, name, uri }));

export function toAlbumRef(a: SpotifyAlbumRef): AlbumRefDto {
  return {
    id: a.id,
    name: a.name,
    uri: a.uri,
    images: images(a.images),
    artists: artists(a.artists),
  };
}

export function toTrack(t: SpotifyTrack): TrackDto {
  return {
    id: t.id,
    uri: t.uri,
    name: t.name,
    durationMs: t.duration_ms,
    explicit: Boolean(t.explicit),
    artists: artists(t.artists),
    album: toAlbumRef(t.album),
  };
}

export function toPlaybackState(s: SpotifyPlaybackState): PlaybackStateDto {
  // Episodes/ads have a different shape; only tracks are supported for now.
  const track = s.item && s.item.album ? toTrack(s.item) : null;
  return {
    device: {
      id: s.device.id,
      name: s.device.name,
      type: s.device.type,
      volumePercent: s.device.volume_percent,
    },
    isPlaying: s.is_playing,
    progressMs: s.progress_ms ?? 0,
    shuffle: s.shuffle_state,
    repeat: s.repeat_state,
    contextUri: s.context?.uri ?? null,
    track,
  };
}
