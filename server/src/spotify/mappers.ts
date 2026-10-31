import type {
  SpotifyAlbumFull,
  SpotifyAlbumRef,
  SpotifyArtist,
  SpotifyDevice,
  SpotifyImage,
  SpotifyPlaybackState,
  SpotifyPlaylistEntry,
  SpotifyPlaylistSummary,
  SpotifyTrack,
} from './types.js';

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

export interface AlbumSummaryDto extends AlbumRefDto {
  albumType: string | null;
  releaseDate: string | null;
  totalTracks: number | null;
}

export interface AlbumDto extends AlbumSummaryDto {
  tracks: TrackDto[];
}

export interface ArtistDto {
  id: string;
  uri: string;
  name: string;
  images: ImageDto[];
  /** `null` when Spotify omits the field (reported removed for Development Mode apps, Feb 2026). */
  genres: string[] | null;
}

export interface PlaylistSummaryDto {
  id: string;
  uri: string;
  name: string;
  description: string | null;
  images: ImageDto[];
  ownerId: string | null;
  ownerName: string | null;
  collaborative: boolean;
  totalItems: number | null;
}

export interface DeviceDto {
  id: string | null;
  name: string;
  type: string;
  isActive: boolean;
  volumePercent: number | null;
}

export function toAlbumSummary(a: SpotifyAlbumFull): AlbumSummaryDto {
  return {
    ...toAlbumRef(a),
    albumType: a.album_type ?? null,
    releaseDate: a.release_date ?? null,
    totalTracks: a.total_tracks ?? null,
  };
}

/** Album tracks come without an `album` field; attach the parent album ref. */
export function toAlbum(a: SpotifyAlbumFull, tracks: Omit<SpotifyTrack, 'album'>[]): AlbumDto {
  const ref: SpotifyAlbumRef = {
    id: a.id,
    name: a.name,
    uri: a.uri,
    images: a.images,
    artists: a.artists,
  };
  return { ...toAlbumSummary(a), tracks: tracks.map((t) => toTrack({ ...t, album: ref })) };
}

export function toArtist(a: SpotifyArtist): ArtistDto {
  return {
    id: a.id,
    uri: a.uri,
    name: a.name,
    images: images(a.images),
    genres: Array.isArray(a.genres) ? a.genres : null,
  };
}

export function toPlaylistSummary(p: SpotifyPlaylistSummary): PlaylistSummaryDto {
  return {
    id: p.id,
    uri: p.uri,
    name: p.name,
    description: p.description || null,
    images: images(p.images ?? undefined),
    ownerId: p.owner?.id ?? null,
    ownerName: p.owner?.display_name ?? null,
    collaborative: Boolean(p.collaborative),
    totalItems: p.items?.total ?? p.tracks?.total ?? null,
  };
}

export function toDevice(d: SpotifyDevice): DeviceDto {
  return {
    id: d.id,
    name: d.name,
    type: d.type,
    isActive: d.is_active,
    volumePercent: d.volume_percent,
  };
}

/** Only real tracks (not episodes/ads, which have no album). */
export const isTrack = (
  t: { type?: string; album?: unknown } | null | undefined,
): t is SpotifyTrack => Boolean(t && t.album && (t.type === undefined || t.type === 'track'));

export interface SavedTrackDto {
  addedAt: string | null;
  track: TrackDto;
}

/** Reads the track from a playlist entry, accepting both the new `item` and the old `track` field. */
export function playlistEntryTrack(e: SpotifyPlaylistEntry): SpotifyTrack | null {
  const candidate = e.item ?? (typeof e.track === 'object' ? e.track : null);
  return isTrack(candidate) ? candidate : null;
}
