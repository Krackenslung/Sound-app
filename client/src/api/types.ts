export interface Image {
  url: string;
  width: number | null;
  height: number | null;
}

export interface ArtistRef {
  id: string | null;
  name: string;
  uri: string;
}

export interface AlbumRef {
  id: string | null;
  name: string;
  uri: string;
  images: Image[];
  artists: ArtistRef[];
}

export interface Track {
  id: string | null;
  uri: string;
  name: string;
  durationMs: number;
  explicit: boolean;
  artists: ArtistRef[];
  album: AlbumRef;
}

export type RepeatMode = 'off' | 'context' | 'track';

export interface PlaybackState {
  device: { id: string | null; name: string; type: string; volumePercent: number | null };
  isPlaying: boolean;
  progressMs: number;
  shuffle: boolean;
  repeat: RepeatMode;
  contextUri: string | null;
  track: Track | null;
}

export interface AlbumSummary extends AlbumRef {
  albumType: string | null;
  releaseDate: string | null;
  totalTracks: number | null;
}

export interface Album extends AlbumSummary {
  tracks: Track[];
}

export interface Artist {
  id: string;
  uri: string;
  name: string;
  images: Image[];
  genres: string[];
}

export interface PlaylistSummary {
  id: string;
  uri: string;
  name: string;
  description: string | null;
  images: Image[];
  ownerId: string | null;
  ownerName: string | null;
  collaborative: boolean;
  totalItems: number | null;
}

export interface Device {
  id: string | null;
  name: string;
  type: string;
  isActive: boolean;
  volumePercent: number | null;
}

export interface OffsetPage<T> {
  items: T[];
  offset: number;
  total: number | null;
  nextOffset: number | null;
}

export interface QueueState {
  currentlyPlaying: Track | null;
  queue: Track[];
}

export interface SavedTrack {
  addedAt: string | null;
  track: Track;
}

export interface MyPlaylist extends PlaylistSummary {
  isOwner: boolean;
  /** Owned or collaborative — items can be read and edited. */
  editable: boolean;
}
